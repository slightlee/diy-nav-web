import { describe, expect, it } from 'vitest'
import { buildBookmarkTaxonomyRequest, parseChromeBookmarks } from './chrome-bookmarks'

const chromeBookmarkHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><H3>开发 &amp; 开源</H3>
    <DL><p>
      <DT><A HREF="https://github.com/#readme" ADD_DATE="1700000000">GitHub &amp; Code</A>
      <DT><A HREF="https://github.com/">重复项</A>
      <DT><A HREF="javascript:alert(1)">无效项</A>
    </DL><p>
    <DT><A HREF="https://www.google.com/search?q=test">Google 搜索</A>
  </DL><p>
</DL><p>`

describe('Chrome bookmark parser', () => {
  it('preserves useful nested folders and skips duplicates and invalid URLs', () => {
    const result = parseChromeBookmarks(chromeBookmarkHtml)

    expect(result.bookmarks).toHaveLength(2)
    expect(result.duplicateCount).toBe(1)
    expect(result.invalidCount).toBe(1)
    expect(result.folderCount).toBe(1)
    expect(result.bookmarks[0]).toMatchObject({
      name: 'GitHub & Code',
      url: 'https://github.com/',
      folderPath: '开发 & 开源'
    })
    expect(result.bookmarks[1].folderPath).toBe('')
  })

  it('builds a bounded taxonomy digest instead of sending every raw field', () => {
    const bookmarks = Array.from({ length: 400 }, (_, index) => ({
      sourceId: `b${index}`,
      name: `网站 ${index}`,
      url: `https://domain-${index}.example.com/path`,
      folderPath: `文件夹 ${index}`
    }))
    const digest = buildBookmarkTaxonomyRequest(bookmarks)

    expect(digest.total).toBe(400)
    expect(digest.folders.length).toBeLessThanOrEqual(100)
    expect(digest.domains.length).toBeLessThanOrEqual(300)
    expect(digest.samples.length).toBeLessThanOrEqual(300)
  })

  it('rejects files without importable web bookmarks', () => {
    expect(() => parseChromeBookmarks('<html><a href="file:///tmp/a">本地文件</a></html>')).toThrow(
      '文件中没有可导入的 http 或 https 书签'
    )
  })
})
