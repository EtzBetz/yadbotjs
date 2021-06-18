# Scraper Documentation
## Function Calls
1. setup()
    1. When `enabled` is `true` in the scrapers config, it will run `createTimerInterval()` after 5 seconds.
1. createTimerInterval()
    1. Runs `timeIntervalBody()` in a loop, dependent on `getScrapingInterval()`, which per default reads `interval_milliseconds` from the scrapers config.
1. timeIntervalBody()
    1. Runs `getScrapingUrl()`, usually just reads `scraping_url` from scrapers config.
    1. Runs `requestWebsite()` with the given scraping URL.
    1. Runs `parseWebsiteContentToJSON()` with the data given to generate JSON from the website content.
    1. Runs `filterNewContent()` with the generated JSON, marking old content, updating or saving new.
    1. Runs `getSortingFunction()` to sort new content after specified arguments.
    1. Runs `getEmbed()` to generate Discord embeds from generated JSON.
    1. Runs `filterEmbedLength()` to filter length of generated embeds according to Discord's policies.
    1. Runs `sendEmbedMessages()` to send and update new content to subscribed users and guilds.
## `scrapeInfo` Object
```text
{
    url: String,                    // generated from getScrapingUrl()
    response: AxiosResponse,        // returned from requestWebsite()
    content: [
        {
            json: parsed JSON data, // parsed from parseWebsiteContentToJSON()
            newData: Boolean,       // determined by filterNewContent()
            rendered: DiscordEmbed  // generated by getEmbed()
        },
        ...
    ]
}
```