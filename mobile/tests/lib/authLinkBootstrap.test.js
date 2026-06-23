import { publishAuthLinkUrl, subscribeAuthLinkUrls } from '../../src/lib/authLinkBootstrap';

describe('authLinkBootstrap', () => {
  test('queues and replays URLs that arrive before subscribe', () => {
    const handler = jest.fn();
    publishAuthLinkUrl('exp://192.168.1.1:8082?auth_callback=1&code=abc');
    const unsubscribe = subscribeAuthLinkUrls(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('exp://192.168.1.1:8082?auth_callback=1&code=abc');
    unsubscribe();
  });

  test('dedupes identical URLs from getInitialURL and url event', () => {
    const handler = jest.fn();
    const url = 'exp://192.168.1.1:8082?auth_callback=1&code=def';
    const unsubscribe = subscribeAuthLinkUrls(handler);

    publishAuthLinkUrl(url);
    publishAuthLinkUrl(url);

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
