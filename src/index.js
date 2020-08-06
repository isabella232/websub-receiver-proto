const Koa = require('koa');
const Router = require('koa-router');
const serverless = require('serverless-http');
const shortHash = require('short-hash');
const qs = require('qs');
const router = new Router();
const app = new Koa();

async function verifySubscription(ctx) {
  const querystring = qs.parse(ctx.querystring);
  const challenge = querystring['hub.challenge'];

  const mode = querystring['hub.mode'];
  if (mode !== 'subscribe') {
    throw Error(`Invalid hub.mode '${mode}' on subscription attempt for ID ${id}`);
  }

  const id = querystring['id'];
  const topic = querystring['hub.topic'];
  if (id !== shortHash(topic)) {
    throw Error (`Mismatch in topic and hashed ID: ${id} & '${topic}'`);
  }

  const leaseInHours = parseInt(querystring['hub.lease_seconds'])/60/60;
  console.log(`Verified subscription to ${topic} (ID=${id}), for ${leaseInHours} hours`);
  
  return Promise.resolve(challenge);
}

function fetchFeedUpdates(ctx) {
  // most feed updates are just a POST with a link to the feed 
  // todo: 
  // - grab topic url from request.header.link  
  // - make get request to topic url 
  // - update imaginary data store with new information
}

router
  .get('/receiver', async (ctx) => {
    ctx.body = verifySubscription(ctx)
    console.log(`CTX: ${JSON.stringify(ctx)}`);
  })
  .post('/receiver', async (ctx) => {
    console.log(`CTX: ${JSON.stringify(ctx)}`);
    fetchFeedUpdates(ctx);
  })

app.use(router.routes());
app.listen(3000);
module.exports.handler = serverless(app);