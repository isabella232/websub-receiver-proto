const axios = require('axios');
const csvparse = require('csv-parse')
const fs = require('fs')
const _ = require('lodash');
const shortHash = require('short-hash');
const qs = require('qs');
const x2j = require('xml2js');

const cwd = process.cwd()
const lambdaURL = 'https://fjhsjynz6f.execute-api.us-east-1.amazonaws.com/dev'

async function findHubURL(feedURL) {
  const response = await axios.get(feedURL);
  return x2j.parseStringPromise(response.data).then((feed) => {
    // this does not accurately capture all links, only links found in "atom:link" ... investigate what other options there are
    const links = _.get(feed, 'rss.channel[0]["atom:link"]') 
    if (links.length < 2) {
      return null;
    }
    const webSubHubURL = _.get(links[1], '$.rel') == 'hub' ? _.get(links[1], '$.href') : _.get(links[0], '$.href');
    return (webSubHubURL);
  })
  .catch(function (err) {
    throw Error(err);
  });
}

async function makeSubscriptionRequest(feedURL) {
  const callbackURL = `${lambdaURL}/receiver?id=${shortHash(feedURL)}`;
  const webSubHubURL = await findHubURL(feedURL);

  if (!webSubHubURL) {
    throw Error(`WebSub hub not found for ${feedURL}`);
  }

  const subscriptionRequestData = qs.stringify({
    'hub.mode': 'subscribe',
    'hub.topic': feedURL,
    'hub.callback': callbackURL
  });

  const axiosConfig = {
    method: 'post',
    url: webSubHubURL,
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: subscriptionRequestData,
  };

  const response = await axios(axiosConfig);
  const status = response.status;
  if (status == '202') {
    console.log(`Status: ${status}\nHub: ${webSubHubURL}\nTopic: ${feedURL}\nCallback: ${callbackURL}\n`);
  } else {
    throw Error(`${status}: Failed to request subscription for ${feedURL}\n`);
  }
}

// const sampleFeed = 'https://media.krcb.org/podcast/mouthful/feed/podcast/';
// makeSubscriptionRequest(sampleFeed)

fs.readFile(`${cwd}/feedlist-urls.csv`, function (err, fileData) {
  csvparse(fileData, {columns: false, trim: true}, function(err, rows) {
    for (row of rows) {
      makeSubscriptionRequest(row[0]);
    };
  })
})
