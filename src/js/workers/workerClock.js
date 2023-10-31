// dedicated thread for main clock

let interval;

self.addEventListener('message', function(event) {
    const data = event.data;

    switch (data.cmd) {
        case 'startClock':
            if (interval) clearInterval(interval);
            interval = setInterval(() => {
                self.postMessage({ cmd: 'tick' });
            }, data.interval);
            break;
        case 'stopClock':
            if (interval) clearInterval(interval);
            break;
    }
});
