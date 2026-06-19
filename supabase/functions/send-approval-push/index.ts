import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PushEvent = 'session_submitted' | 'session_approved' | 'session_declined' | 'session_withdrawn';

interface RequestBody {
  event: PushEvent;
  sessionId: string;
  requestHash: string;
  clientVersion?: string;
}

async function sendExpoPush(messages: Record<string, unknown>[]) {
  if (!messages.length) return { ok: true, sent: 0 };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Expo push failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing_auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    const { event, sessionId, requestHash } = body;
    if (!event || !sessionId || !requestHash) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, teen_user_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'session_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let recipientIds: string[] = [];
    let title = '';
    let bodyText = '';
    let dataType = '';

    if (event === 'session_submitted') {
      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('submissions')
        .select('submitted_by_user_id, superseded')
        .eq('request_hash', requestHash)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (
        submissionError ||
        !submission ||
        submission.superseded ||
        submission.submitted_by_user_id !== user.id ||
        session.teen_user_id !== user.id
      ) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: links, error: linksError } = await supabaseAdmin
        .from('links')
        .select('adult_user_id')
        .eq('teen_user_id', session.teen_user_id)
        .eq('status', 'active');

      if (linksError) throw linksError;
      recipientIds = (links ?? []).map((row) => row.adult_user_id);

      const { data: teenProfile } = await supabaseAdmin
        .from('users')
        .select('legal_name')
        .eq('id', session.teen_user_id)
        .maybeSingle();

      const teenName = teenProfile?.legal_name?.trim() || 'Your teen';
      title = 'Session ready to approve';
      bodyText = `${teenName} submitted a practice session for your approval.`;
      dataType = 'pending_approval';
    } else if (event === 'session_approved') {
      const { data: approval, error: approvalError } = await supabaseAdmin
        .from('approvals')
        .select('approved_by_user_id')
        .eq('request_hash', requestHash)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (approvalError || !approval || approval.approved_by_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      recipientIds = [session.teen_user_id];

      const { data: adultProfile } = await supabaseAdmin
        .from('users')
        .select('legal_name')
        .eq('id', user.id)
        .maybeSingle();

      const adultName = adultProfile?.legal_name?.trim() || 'Supervisor';
      title = 'Session approved';
      bodyText = `${adultName} approved your practice session.`;
      dataType = 'session_approved';
    } else if (event === 'session_declined') {
      const { data: link, error: linkError } = await supabaseAdmin
        .from('links')
        .select('adult_user_id')
        .eq('teen_user_id', session.teen_user_id)
        .eq('adult_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (linkError || !link) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('submissions')
        .select('superseded')
        .eq('request_hash', requestHash)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (submissionError || !submission || !submission.superseded) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      recipientIds = [session.teen_user_id];

      const { data: adultProfile } = await supabaseAdmin
        .from('users')
        .select('legal_name')
        .eq('id', user.id)
        .maybeSingle();

      const adultName = adultProfile?.legal_name?.trim() || 'Supervisor';
      title = 'Session sent back';
      bodyText = `${adultName} sent your practice session back for revision.`;
      dataType = 'session_declined';
    } else if (event === 'session_withdrawn') {
      if (session.teen_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('submissions')
        .select('superseded')
        .eq('request_hash', requestHash)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (submissionError || !submission || !submission.superseded) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: links, error: linksError } = await supabaseAdmin
        .from('links')
        .select('adult_user_id')
        .eq('teen_user_id', session.teen_user_id)
        .eq('status', 'active');

      if (linksError) throw linksError;
      recipientIds = (links ?? []).map((row) => row.adult_user_id);

      const { data: teenProfile } = await supabaseAdmin
        .from('users')
        .select('legal_name')
        .eq('id', session.teen_user_id)
        .maybeSingle();

      const teenName = teenProfile?.legal_name?.trim() || 'Your teen';
      title = 'Session withdrawn';
      bodyText = `${teenName} withdrew a session that was pending your approval.`;
      dataType = 'submission_withdrawn';
    } else {
      return new Response(JSON.stringify({ error: 'unknown_event' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    recipientIds = recipientIds.filter((id) => id !== user.id);
    if (!recipientIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .in('user_id', recipientIds);

    if (tokenError) throw tokenError;

    const tokens = [...new Set((tokenRows ?? []).map((row) => row.token))];
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body: bodyText,
      sound: 'default',
      channelId: 'approvals',
      data: {
        type: dataType,
        sessionId,
        requestHash,
        deepLink:
          dataType === 'pending_approval'
            ? `boundfortheroad://approve?requestHash=${requestHash}`
            : `boundfortheroad://dashboard`,
      },
    }));

    const result = await sendExpoPush(messages);
    return new Response(JSON.stringify({ ok: true, sent: messages.length, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
