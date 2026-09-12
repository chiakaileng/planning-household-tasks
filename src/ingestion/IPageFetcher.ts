export interface IPageFetcher {
  fetchHtml(url: string): Promise<string>;
}
