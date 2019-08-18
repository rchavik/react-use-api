/// <reference path="../typings.d.ts" />

import LRU from 'lru-cache'
import { configure, defaultSettings } from '../common'
import * as ssrModule from '../ssr'

jest.mock('../common', () => {
  const common = jest.requireActual('../common')
  return {
    ...common,
    axiosAll: jest.fn()
  }
})

const { feedRequests, injectSSRHtml, loadApiCache } = ssrModule
const originalLog = console.log

beforeEach(() => {
  jest.resetModules()
})

afterEach(() => {
  console.log = originalLog
})

const copySettings = () => ({
  ...defaultSettings,
  cache: new LRU<string, ReactUseApi.CacheData | any>(),
  isSSR: () => true
})
const testCache = new LRU<string, ReactUseApi.CacheData | any>()
testCache.set('foo', 'bar')
testCache.set('abc', 123)
const cacheData = testCache.dump()

describe('feedRequests tests', () => {
  const { axiosAll } = require('../common')

  it('should work as expected', async () => {
    let count = 1
    const ssrConfigs = [
      {
        config: {
          url: '/api/v1/api1'
        },
        cacheKey: 'foo'
      }
    ]
    const renderSSR = jest.fn(() => {
      if (count-- > 0) {
        // for the second time
        ssrConfigs.push({
          config: {
            url: '/api/v1/api2'
          },
          cacheKey: 'abc'
        })
      }
      return '<div>Hello World!</div>'
    })
    const context = configure({
      settings: {
        ...copySettings(),
        renderSSR,
        debug: false
      }
    })
    const {
      settings: { cache },
      collection
    } = context
    collection.ssrConfigs = ssrConfigs
    const response = {
      data: {
        message: 'ok'
      }
    }
    axiosAll.mockReset().mockResolvedValue(response)
    const ssrHtml = await feedRequests(context, '')
    const { cacheKeys } = collection
    expect(ssrConfigs.length).toBe(0)
    expect(cacheKeys.size).toBe(0)
    expect(ssrHtml).toBe('<div>Hello World!</div>')
    expect(cache.dump()).toEqual([
      { k: 'abc', v: { response }, e: 0 },
      { k: 'foo', v: { response }, e: 0 }
    ])
    expect(renderSSR).toHaveBeenCalledTimes(2)
  })

  it('should work as expected if error', async () => {
    const ssrConfigs = [
      {
        config: {
          url: '/api/v1/api1'
        },
        cacheKey: 'foo'
      }
    ]
    const renderSSR = jest.fn().mockReturnValue('<div>Hello World!</div>')
    const context = configure({
      settings: {
        ...copySettings(),
        renderSSR,
        debug: true
      }
    })
    const {
      settings: { cache },
      collection
    } = context
    collection.ssrConfigs = ssrConfigs
    const error = {
      response: {
        data: {
          message: 'fail'
        }
      }
    }
    axiosAll.mockReset().mockRejectedValue(error)
    console.log = jest.fn()
    const ssrHtml = await feedRequests(context, '')
    expect(ssrConfigs.length).toBe(0)
    expect(console.log).toHaveBeenCalledWith(
      '[ReactUseApi][Collecting Requests]'
    )
    expect(console.log).toHaveBeenCalledWith('[ReactUseApi][Fetch]', 'foo')
    expect(console.log).toHaveBeenCalledWith(
      '[ReactUseApi][Requests Count] =',
      0
    )
    expect(console.log).toHaveBeenCalledWith(
      '[ReactUseApi][Executed times] =',
      1
    )
    expect(ssrHtml).toBe('<div>Hello World!</div>')
    expect(cache.dump()).toEqual([
      { k: 'foo', v: { error: error.response }, e: 0 }
    ])
    expect(renderSSR).toHaveBeenCalledTimes(1)
  })

  it('should work as expected if throw an error', async () => {
    const ssrConfigs = [
      {
        config: {
          url: '/api/v1/api1'
        },
        cacheKey: 'foo'
      }
    ]
    const renderSSR = jest.fn().mockReturnValue('<div>Hello World!</div>')
    const context = configure({
      settings: {
        ...copySettings(),
        renderSSR
      }
    })
    const {
      settings: { cache },
      collection
    } = context
    collection.ssrConfigs = ssrConfigs
    const error = {
      message: 'fail'
    }
    axiosAll.mockReset().mockRejectedValue(error)
    await expect(feedRequests(context, '')).rejects.toEqual(error)
    expect(ssrConfigs.length).toBe(1)
    expect(cache.length).toBe(0)
    expect(renderSSR).not.toHaveBeenCalled()
  })

  it('should work well with no ssr configs', async () => {
    const context = configure({
      settings: {
        ...copySettings(),
        debug: true
      }
    })
    console.log = jest.fn()
    const {
      collection: { ssrConfigs }
    } = context
    const ssrHtml = await feedRequests(context, '')
    expect(console.log).toHaveBeenCalledWith(
      '[ReactUseApi][Executed times] =',
      0
    )
    expect(ssrConfigs.length).toBe(0)
    expect(ssrHtml).toBe('')
  })

  it('should work as expected if ssr rendering reaches max requests number', async () => {
    const context = configure({
      settings: {
        ...copySettings()
      }
    })
    const { collection } = context
    collection.ssrConfigs = [
      {
        config: {
          url: '/api/v1/foo/bar'
        },
        cacheKey: ''
      }
    ]
    await expect(feedRequests(context, '', 0)).rejects.toThrow(
      /Maximum executing times while fetching axios requests/
    )
  })
})

describe('injectSSRHtml tests', () => {
  const html = '<div>Hello World</>'
  const feedRequests = jest
    .spyOn(ssrModule, 'feedRequests')
    .mockResolvedValue(html)

  it('should injectSSRHtml work  well with settings.renderSSR', async () => {
    const renderSSR = jest.fn().mockReturnValue(html)
    const context = configure({
      settings: {
        ...copySettings(),
        renderSSR
      }
    })
    const { settings, isSSR } = context
    const { cache } = settings
    cache.reset = jest.fn()
    cache.dump = jest.fn().mockReturnValue({ foo: 'bar' })
    expect.hasAssertions()
    const ssrHtml = await injectSSRHtml(context)
    expect(isSSR).toBe(true)
    expect(renderSSR).toHaveBeenCalled()
    expect(cache.reset).toHaveBeenCalled()
    expect(feedRequests).toHaveBeenLastCalledWith(context, html)
    expect(ssrHtml).toEqual(
      `${html}<script>window.__USE_API_CACHE__ = {"foo":"bar"}</script>`
    )
  })

  it('should injectSSRHtml work well without the html of the api cache script', async () => {
    const renderSSR = jest.fn().mockReturnValue(html)
    const context = configure({
      settings: {
        ...copySettings(),
        renderSSR,
        useCacheData: false
      }
    })
    const { settings } = context
    const { cache } = settings
    cache.reset = jest.fn()
    cache.dump = jest.fn().mockReturnValue({ foo: 'bar' })
    expect.hasAssertions()
    const ssrHtml = await injectSSRHtml(context)
    expect(renderSSR).toHaveBeenCalled()
    expect(cache.reset).toHaveBeenCalled()
    expect(feedRequests).toHaveBeenLastCalledWith(context, html)
    expect(ssrHtml).toEqual(html)
  })
})

describe('loadApiCache tests', () => {
  it('should work well with cache data', () => {
    const { clientCacheVar, cache } = defaultSettings
    Object.assign(window, {
      [clientCacheVar]: cacheData
    })
    loadApiCache()
    expect(cache.dump()).toEqual(cacheData)
    expect(window.hasOwnProperty(clientCacheVar)).toBe(false)
  })

  it('should work well with cache data and autoPurgeCache = false', () => {
    const context = configure({
      settings: {
        ...copySettings(),
        autoPurgeCache: false,
        clientCacheVar: 'MY_CACHE_VAR'
      }
    })
    const {
      settings: { clientCacheVar, cache }
    } = context
    Object.assign(window, {
      [clientCacheVar]: cacheData
    })
    loadApiCache(context)
    expect(cache.dump()).toEqual(cacheData)
    expect(window[clientCacheVar]).toEqual(cacheData)
  })

  it('should nothing happen if there is no cache data', () => {
    const context = configure({
      settings: {
        ...copySettings()
      }
    })
    const {
      settings: { clientCacheVar, cache }
    } = context
    delete window[clientCacheVar]
    loadApiCache(context)
    expect(cache.length).toBe(0)
  })
})
