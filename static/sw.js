//https://khan-photon.medium.com/create-a-simple-progressive-web-app-pwa-1685519acef7

const CACHE_LIST = [
    "/",
    //"/index.ejs",
    //"/push.ejs",
    //"/main.ejs",
    //"/index.js",
    //"/main.js",
    "/main.css",
    "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.3/css/bootstrap.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/axios/0.21.0/axios.js",

];

//const STATIC_CACHE_VERSION = `static-v1-${new Date().getTime()}`
const STATIC_CACHE_VERSION = `static-v1-${new Date().getTime()}`

//glob.sync('static/**/*.*').forEach(file => {
//    CACHE_LIST.push(file);});


self.addEventListener('push', e =>{
    const data = e.data.json();
    self.registration.showNotification(data.title,{
        body:'Your diary has been successfully added!',
        icon: 'logo.jpg'
    });
});
self.addEventListener('install', function(event) {
    console.log(caches)
    console.log("SW Install Event: Is in the process");
    const onSuccessCachesOpen = (cache) => {
        console.log(cache)
        console.log("SW Install Event: Successfully opened the cache and add the cache list");
        return cache.addAll(CACHE_LIST)
    }

    event.waitUntil(
        caches.open(STATIC_CACHE_VERSION).then(onSuccessCachesOpen)
    )
})


self.addEventListener('activate', (event) => {
    console.log("SW Activate Event: Is in the process")

    const onSuccessCachesKeys = (cacheNames) => {
        console.log(cacheNames)
        return Promise.all(
            cacheNames.map((cache) => {
                if (cache !== STATIC_CACHE_VERSION) {
                    console.log(`SW Activate Event: Remove the cache: ${cache}`);
                    return caches.delete(cache)
                }
            })
        )
    }

    event.waitUntil(caches.keys().then(onSuccessCachesKeys))
})



self.addEventListener('fetch', (event) => {
    const FALLBACK_URL = CACHE_LIST[0];
    console.log("SW Fetch Event: Is in the process");

    const onSuccessFetch = response => {
        if (CACHE_LIST.includes(new URL(event.request.url).pathname)) return response
        const onSuccessDynamicCacheOpen = cache => {
            cache.put(event.request.url, response.clone())
            return response
        }

        return caches
            .open(STATIC_CACHE_VERSION)
            .then(onSuccessDynamicCacheOpen)
            .catch(() => caches.match(FALLBACK_URL))
    }

    const onErrorFetch = () => {
        const onSuccessCacheMatch = response => {
            if (response) return response
            else return caches.match(FALLBACK_URL)
        }

        return caches.match(event.request).then(onSuccessCacheMatch)
    }

    event.respondWith(
        fetch(event.request)
            .then(onSuccessFetch)
            .catch(onErrorFetch)
    )
})



