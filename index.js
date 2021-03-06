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

    //if the hostname begins with a wildcard, let's use a regular
    //expression to find all matching names
    if(hostnames[i][0] == "*") {
      //construct the regular expression
      regex = new RegExp("."+hostnames[i].replace(".","\\.")+"\\."+username.replace(".","\\."), 'g');

      //match the records from the zone
      matchedRecords = (await cf.listRecords(zone))
        .filter((r) => r.name.match(regex))

      //update all matches
      for(j=0;j<matchedRecords.length;j++) {
        await cf.updateRecord(matchedRecords[j], ip)
      }
    }
    else {
      //compute the full host name
      hostname = hostnames[i] + '.' + username
      record = await cf.findRecord(zone, hostname)

      //update the record
      await cf.updateRecord(record, ip)  
    }
  }

  return new Response('ok', {
    headers: {
      'content-type': 'text/plain'
    },
    status: 200
  })
}
