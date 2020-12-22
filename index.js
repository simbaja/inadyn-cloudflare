const url = require('url');
const Cloudflare = require('./lib/cloudflare')

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {

  // Get Credentials
  const b64auth = (request.headers.get("Authorization") || '').split(' ')[1] || ''
  const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':')

  if(!username || !password) {
    return new Response('', {
      headers: {
        'content-type': 'text/plain',
      },
      status: 401,
    })
  }

  // Parse Url
  const requestUrl = url.parse(request.url, true)

  if (requestUrl.pathname != '/update') {
    return new Response('', {
      headers: {
        'content-type': 'text/plain',
      },
      status: 404,
    })
  }
  const query = requestUrl.query
  const hostname_raw = query.hostname
  const ip = query.ip

  // Get the list of hostnames
  hostnames = hostname_raw.split(";")

  // Initialize cloudflare
  const cf = new Cloudflare({
    token: password,
  })

  const zone = await cf.findZone(username)
  for(i=0;i<hostnames.length;i++) {

    //compute the full host name
    hostname = hostnames[i] + '.' + username
    const record = await cf.findRecord(zone, hostname)

    //update the record
    await cf.updateRecord(record, ip)  
  }

  return new Response('ok', {
    headers: {
      'content-type': 'text/plain'
    },
    status: 200
  })
}
