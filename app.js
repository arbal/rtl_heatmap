$(document).ready(function() {
    if(window.localStorage.getItem("welcomed") === "true") {
        $('.open-file').hide();
        $('#row-hide').hide();
    }

    if(window.localStorage.getItem("colormap") !== undefined) {
        colorMap = JSON.parse(window.localStorage.getItem("colormap"));
    }   

    $('#dismiss-button').click(function(ev) {
        ev.stopPropagation();

        window.localStorage.setItem("welcomed", true);
        $('.open-file').fadeOut(200, function() {
            $('#row-hide').hide();   
        });
    });

    $('#open-button').click(function(ev) {
        $('#open-modal').openModal(); 
    });

    $('#display-btn').click(function(ev) {
        ev.stopPropagation();

        var file = $('#file');
        $('#open-modal').closeModal();
        showSpinner();
        parseCSV(file);
    });

    $('#setttings-button').click(function(ev) {
        ev.stopPropagation();

        showSettings();
    });

    $('#save-btn').click(function(ev) {
        ev.stopPropagation();

        var color = $('input:radio[name=color-scheme]').filter(":checked").val();
        $('#settings-modal').closeModal();

        setColorScheme(color);
    });

});

var colorMap = ["#2D7B86", "#DB8E47", "#DB5147"];

function setScheme(col1, col2, col3) {
    colorMap = [col1, col2, col3];
    window.localStorage.setItem("colormap", JSON.stringify(colorMap));

    redraw();
}

function setColorScheme(scheme) {
    switch(parseInt(scheme)) {
        case 1:
            setScheme("#2D7B86", "#DB8E47", "#DB5147");
            break;

        case 2:
            setScheme("#0000bd", "#a7ff58", "#840000");
            break;

        case 3:
            setScheme("#ffffff", "#ff7f00", "#2F0000");
            break;

        case 4:
            setScheme("#00ffff", "#7788ff", "#ff00ff");
            break;
    }
}

function showSettings() {
    $('#settings-modal').openModal();    
}

function showSpinner() {
    $('#spinner').css('visibility', 'visible');
}

function hideSpinner() {
    $('#spinner').css('visibility', 'hidden');
}

function parseCSV(file) {
    img = [];
    minDb = null;
    maxDb = null;

    Papa.parse(file.prop('files')[0], {
        worker: true,
        skipEmptyLines: true,
        step: function(result) {
            handleSamples(result.data);
        },
        complete: function() {
            drawAll();
            hideSpinner();

            var $panzoom = $('.panzoom').panzoom();

            $panzoom.parent().on('mousewheel.focal', function( e ) {
                e.preventDefault();
                var delta = e.delta || e.originalEvent.wheelDelta;
                var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
                $panzoom.panzoom('zoom', zoomOut, {
                    increment: 0.1,
                    animate: false,
                    focal: e
                });
           });

        }
    });
}

var lastTime = null;
var curSamps = [];
var freqMin = null;
var freqMax = null;
var freqs = [];

function sort(array){
    var keys = new Array();
    var value = {};

    for (var elem in array){
        keys.push(elem);
    }

    keys.sort();
    
    for (var elem in keys){
        value[keys[elem]] = array[keys[elem]];
    }

    return value;
}

var sweep = [];

function handleSamples(dat) {
    var data = dat[0];
    var time = data[0] + data[1].replace(' ', 'T') + "Z";
    var ptime = new Date(time);

    var curMin = parseInt(data[2]);
    var curMax = parseInt(data[3]);
    var step = parseInt(data[4]);
    var numSamps = data[5];
    
    // check if a new sweep has started
    if(lastTime != null && +ptime != +lastTime) {
        //draw(sweep, freqMin, freqMax, step, lastTime);

        // clone sweep and add it to the image
        img.push(sweep.slice(0));

        sweep = [];
        lastTime = null;
        curSamps = [];
    } else {
        lastTime = ptime;

        if(freqMin === null || curMin < freqMin) {
            freqMin = curMin;
        }

        if(freqMax === null || curMax > freqMax) {
            freqMax = curMax;
        }

        var freq = curMin;

        for(var i = 6; i < data.length; i++) {
            var db = parseFloat(String(data[i]).replace(' ', '').replace('-', ''));
            sweep.push(db);

            if(maxDb === null || (100-db) > maxDb) {
                maxDb = 100-db;
            }

            if(minDb === null || (100-db) < minDb) {
                minDb = 100-db;
            }
        }

    }
}

var canvas = null;
var ctx = null;
var pntWidth = 0;
var pntHeight = 0;
var img = [];

var maxDb = null;
var minDb = null;

function draw(samps, min, max, step, time) {
    pntWidth = Math.round(($(canvas).width() / samps.length));
    var line = [];

    for(var i = min; i < max; i += step) {
        var value = samps[i]; 
        
        if(value === undefined) {
            continue;
        }

        var db = parseFloat(String(value).replace(' ', '').replace('-', ''));

        if(maxDb === null || (100-db) > maxDb) {
            maxDb = 100-db;
        }

        if(minDb === null || (100-db) < minDb) {
            minDb = 100-db;
        }

        line.push(db);
    }

    img.push(line);
}

var drawed = false;

function drawAll() {
    drawed = true;
    var height = Math.min(img.length, 16000);
    var width = img[0].length;
    
    var pph = Math.max(Math.round($(canvas).height()/height), 1);
    var ppw = Math.max(Math.round($(canvas).width()/width), 1);

    canvas = document.getElementById('spectrum');
    $(canvas).height(pph*height);
    $(canvas).width(ppw*width);

    canvas.height = pph*height;
    canvas.width = ppw*width;

    ctx = canvas.getContext('2d');
    ctx.scale(1, 1);

    console.log("[Rendering image] minFreq: " + freqMin + ", maxFreq: " + freqMax + ", width: " + width + ", height: " + height + ", PpH: " + pph + ", PpW: "+ ppw);
    console.log("min db: "+ minDb + ", max db: " + maxDb);

    var scale = chroma.scale(colorMap);

    for(var y = 0; y < height; y++) {
        for(var x = 0; x < width; x++) {
            var db = Math.round(img[y][x]);
            var dbP = ((100-db)-minDb)/(maxDb-minDb);
            var color = scale(dbP).hex();
            ctx.fillStyle = color;
            ctx.fillRect(x*ppw, y*pph, ppw, pph);
        }
    }

    drawLabels(width);
}

var numLabels = 10;

function formatFreq(freq) {
    if(freq > 1e6) {
        return (parseInt(freq)/1e6).toFixed(2) + "M";
    } else if(freq > 1e3) {
        return (parseInt(freq)/1e3).toFixed(2) + "k";
    } else {
        return freq;
    }
}

function drawLabels(width) {
    var step = width/numLabels;
    var frqStep = (freqMax-freqMin)/numLabels;
    
    for(var i = 0; i <= numLabels; i++) {
        var frq = frqStep*i;

        ctx.font="14px Georgia";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(formatFreq(frq+freqMin),Math.round(step*i),10);
    }
}

function redraw() {
    if(!drawed) {
        return;
    }

    drawAll();
}
