import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { newFetchRequest } from "../fetchRequest";

describe("newFetchRequest", () => {
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  });

  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const mockBaseUrl = "http://api.example.com";
  const mockToken = "mock-token";
  const mockGetToken = vi.fn(() => mockToken);

  // 基本的测试实例配置
  const createTestInstance = (
    customHandleMessage?: {
      success?: (msg: string) => void;
      error?: (msg: string) => void;
    } | null,
    customLoadingFunction?: {
      start?: () => void;
      finish?: () => void;
      error?: () => void;
    } | null,
    customPanicOrRestart?: () => never,
  ) => {
    return newFetchRequest({
      baseUrl: mockBaseUrl,
      refreshTokenUrl: {
        fetchConfig: {
          url: "/refresh-token",
          method: "POST",
        },
        handleResponse: vi.fn(),
      },
      getToken: mockGetToken,
      handleMessage: customHandleMessage,
      loadingFunction: customLoadingFunction,
      panicOrRestart: customPanicOrRestart,
    });
  };

  // 基本的请求测试
  it("应该正确处理基本的GET请求", async () => {
    const mockHandleMessage = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };
    const mockLoadingFunction = {
      start: vi.fn<() => void>(),
      finish: vi.fn<() => void>(),
      error: vi.fn<() => void>(),
    };
    const fetchInstance = createTestInstance(
      mockHandleMessage,
      mockLoadingFunction,
    );
    const mockResponse = { data: "test" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchInstance.mainFetch({
      url: "/test",
      method: "GET",
    });

    expect(result).toEqual(mockResponse);
    expect(mockLoadingFunction.start).toHaveBeenCalled();
    expect(mockLoadingFunction.finish).toHaveBeenCalled();
  });

  // 重复请求测试
  it("应该正确处理重复请求取消", async () => {
    const mockHandleMessage = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };
    const fetchInstance = createTestInstance(mockHandleMessage);
    const mockResponse = { data: "test" };

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const request = {
      url: "/test",
      method: "GET" as const,
    };

    // 发起第一个请求
    const promise1 = fetchInstance.mainFetch(request, {
      repeatRequestCancel: true,
    });

    // 立即发起第二个相同的请求
    const promise2 = fetchInstance.mainFetch(request, {
      repeatRequestCancel: true,
    });

    const result = await promise1;
    expect(result).toEqual(mockResponse);
    await expect(promise2).rejects.toBe("请求失败");
    expect(mockHandleMessage.error).toHaveBeenCalledWith("重复的请求");
  }, 30000);

  // 工具重置测试
  it("应该正确处理 resetLoadingTool 和 resetMessageTool", async () => {
    const mockHandleMessage = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };
    const mockLoadingFunction = {
      start: vi.fn<() => void>(),
      finish: vi.fn<() => void>(),
      error: vi.fn<() => void>(),
    };
    const fetchInstance = createTestInstance(
      mockHandleMessage,
      mockLoadingFunction,
    );

    const newLoadingTool = {
      start: vi.fn<() => void>(),
      finish: vi.fn<() => void>(),
      error: vi.fn<() => void>(),
    };

    const newMessageTool = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };

    fetchInstance.resetLoadingTool(newLoadingTool);
    fetchInstance.resetMessageTool(newMessageTool);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "error" }),
    });

    await expect(
      fetchInstance.mainFetch({
        url: "/test",
        method: "GET",
      }),
    ).rejects.toEqual({ message: "error" });

    expect(newLoadingTool.start).toHaveBeenCalled();
    expect(newLoadingTool.error).toHaveBeenCalled();
    expect(newMessageTool.error).toHaveBeenCalledWith("【400】error");
  });

  // 测试没有 responseIsJson 的请求
  it("应该正确处理非JSON响应请求", async () => {
    const mockHandleMessage = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };
    const fetchInstance = createTestInstance(mockHandleMessage);
    const mockTextResponse = "plain text response";
    mockFetch.mockResolvedValueOnce(
      new Response(mockTextResponse, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const response = await fetchInstance.mainFetch(
      {
        url: "/test",
        method: "GET",
      },
      {
        responseIsJson: false,
      },
    );

    expect(response).toBeInstanceOf(Response);
  });

  // 测试自定义contentType
  it("应该正确处理自定义 Content-Type", async () => {
    const fetchInstance = createTestInstance();
    const customContentType = "application/custom+json";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await fetchInstance.mainFetch(
      {
        url: "/test",
        method: "POST",
        data: { test: "data" },
      },
      {
        contentType: customContentType,
      },
    );

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get("Content-Type")).toBe(customContentType);
  });

  // 测试带query参数的URL
  it("应该正确处理复杂的URL参数", async () => {
    const fetchInstance = createTestInstance();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const params = {
      array: "1,2,3",
      object: "test",
      special: "!@#$%^&*()",
    };

    await fetchInstance.mainFetch({
      url: "/test",
      method: "GET",
      params,
    });

    const expectedUrl = `http://api.example.com/test?${new URLSearchParams(params).toString()}`;
    expect(mockFetch.mock.calls[0][0]).toBe(expectedUrl);
  });

  // 测试重复请求忽略参数
  it("应该正确处理重复请求忽略参数", async () => {
    const mockHandleMessage = {
      success: vi.fn<(msg: string) => void>(),
      error: vi.fn<(msg: string) => void>(),
    };
    const fetchInstance = createTestInstance(mockHandleMessage);
    const mockResponse = { data: "test" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    // .mockResolvedValueOnce({
    //     ok: true,
    //     json: () => Promise.resolve(mockResponse),
    // })

    const request1 = {
      url: "/test",
      method: "POST" as const,
      data: { id: 1 },
    };

    const request2 = {
      url: "/test",
      method: "POST" as const,
      data: { id: 2 },
    };

    // 第一个请求
    const promise1 = fetchInstance.mainFetch(request1, {
      repeatRequestCancel: true,
      repeatIgnoreParams: true,
    });

    // 第二个请求，虽然参数不同，但因为设置了 repeatIgnoreParams，所以应该被取消
    const promise2 = fetchInstance.mainFetch(request2, {
      repeatRequestCancel: true,
      repeatIgnoreParams: true,
    });

    await promise1;
    await expect(promise2).rejects.toBe("请求失败");
    expect(mockHandleMessage.error).toHaveBeenCalledWith("重复的请求");
  });

  // 测试重复请求使用自定义key
  it("应该正确处理重复请求自定义key", async () => {
    const fetchInstance = createTestInstance();
    const mockResponse = { data: "test" };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const customKey = "customKey";

    // 不同的URL，但使用相同的customKey
    const promise1 = fetchInstance.mainFetch(
      {
        url: "/test1",
        method: "GET",
      },
      {
        repeatRequestCancel: true,
        repeatDangerKey: customKey,
      },
    );

    const promise2 = fetchInstance.mainFetch(
      {
        url: "/test2",
        method: "GET",
      },
      {
        repeatRequestCancel: true,
        repeatDangerKey: customKey,
      },
    );

    await promise1;
    await expect(promise2).rejects.toBe("请求失败");
  });

  // 多次token刷新失败测试
  it("应该正确处理多次 token 刷新失败", async () => {
    const mockHandleMessage = {
      success: vi.fn(),
      error: vi.fn(),
    };
    const mockPanicOrRestart = vi.fn(() => {
      throw new Error("Panic!") as never;
    });

    const testInstance = createTestInstance(
      mockHandleMessage,
      null,
      mockPanicOrRestart,
    );

    // 模拟连续401响应
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Token expired" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Token expired" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Token expired" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Token expired" }),
      });

    try {
      await testInstance.mainFetch({
        url: "/test",
        method: "GET",
      });
    } catch (error) {
      expect(error).toBeDefined();
    }

    expect(mockHandleMessage.error).toHaveBeenCalledWith("登录失效");
    expect(mockPanicOrRestart).toHaveBeenCalled();
  }, 30000);
});
