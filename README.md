![data monster logo](/img/data_monster_logo.png)

Data Monster
============

*  [What is Data Monster?](#what-is-data-monster)
*  [Why would I use this?](#why-would-I-use-this)
*  [Okay, I’m convinced. How do I monster?](#how-do-i-monster)
  - [Installing](#installing)
  - [Chomping (aka compiling)](#chomping-aka-compiling-the-file)
  - [Writing a Chompable (Data Monster) File](#writing-a-chompable-file)
*  [Why would you build this?](#why-would-you-build-this)
*  [Feedback, the Future + Contributing](#feedback-the-future--contributing)
*  [License](#license)

## What is Data Monster?

Data Monster is a domain-specific language that transpiles to d3.js files (plus some helper HTML and CSS files, if necessary).

This is its alpha.

To draw something like this:

![scatterplot](/img/scatterplot.png)

you use input like this:

```

(data: ‘van_gogh_additional_measurements.tsv’
  (clean: #{ d.Shape_Count = +d.Shape_Count,
             d.ratio = +d[“Image_Height/Image_Width “]                    
            }
  )
  (canvas: 1000 600 {20 20 60 60} ‘#scatterplot’
    (color: category10)
    (scale-x: linear 
              domain: { 0 maxX } 
              range:  { 0 width } ) 
    (elem: circle: { cx: d.ratio, cy: d.Shape_Count, r: 4, fill: d.Year }
           attr: { ‘class’: ‘dot’ }
           tooltips: true
           click: #{ function(d) { window.open(‘https://www.google.com/search?site=imghp&tbm=isch&q=van+gogh+'+d.Title); }})
    (axis-x: attr: { ‘class’: ‘label’, ‘x’: width, ‘y’: 50 }
             style: { ‘text-anchor’: ‘end’ }
             text: ‘Height: Width Ratio’ )
    (axis-y: attr: { ‘class’: ‘label’, ‘y’: -10 }
             style: { ‘text-anchor’: ‘end’ }
             text: ‘Num Shapes’ )
  )
)

```
to generate output like this:

```javascript

function draw_canvas_2e16a1dd(data) {
    var margin = {
            top: 20,
            right: 20,
            bottom: 60,
            left: 60
        },
        width = 920,
        height = 520;
    var maxY = d3.max(data, function(d) {
            return d.Shape_Count
        }),
        maxX = d3.max(data, function(d) {
            return d.ratio
        });
    maxY = maxY + (maxY * .25) // Make it a little taller 
    var xScale = d3.scale.linear()
        .domain([0, maxX])
        .range([0, width]),
        yScale = d3.scale.linear()
        .domain([0, maxY])
        .range([height, 0]),
        color = d3.scale.category10();
    var svg = d3.select(‘#scatterplot’)
        .append(‘svg’)
        .attr(‘width’, width + margin.left + margin.right)
        .attr(‘height’, height + margin.top + margin.bottom)
        .append(‘g’)
        .attr(‘transform’, ‘translate(‘ + margin.left + ‘, ‘ + margin.top + ‘)’);
    svg.selectAll(‘circle’)
        .data(data)
        .enter()
        .append(‘g’)
        .attr(‘class’, ‘elements’)
        .append(‘circle’)
        .attr({
            cx: function(d) {
                return xScale(d.ratio)
            },
            cy: function(d) {
                return yScale(d.Shape_Count)
            },
            r: 4,
            fill: function(d) {
                return color(d.Year)
            }
        })
        .attr({
            “class”: “dot”
        })
        .on(‘mouseover’, function(d) {
            var xPosition = event.clientX + scrollX < width - 200 ? event.clientX + scrollX : event.clientX + scrollX - 200,
                yPosition = event.clientY + scrollY + 100 > height ? event.clientY + scrollY - 25 : event.clientY + scrollY + 5,
                text = d.ratio + ‘; ‘ + d.Shape_Count;
            d3.select(‘#tooltip’)
                .style(‘left’, xPosition + ‘px’)
                .style(‘top’, yPosition + ‘px’)
                .select(‘#values’)
                .text(text);
            d3.select(‘#tooltip’)
                .classed(‘hidden’, false);
        })
        .on(‘mouseout’, function() {
            d3.select(‘#tooltip’)
                .classed(‘hidden’, true);
        })
        .on(‘click’, function(d) {
            window.open(‘https://www.google.com/search?site=imghp&tbm=isch&q=van+gogh+' + d.Title);
        });
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient(‘bottom’);
    svg.append(‘g’)
        .attr(‘class’, ‘x axis’)
        .attr(‘transform’, ‘translate(0,’ + height + ‘)’)
        .call(xAxis)
        .append(‘text’)
        .attr({
            “class”: “label”,
            “x”: 920,
            “y”: 50
        })
        .style({
            “text-anchor”: “end”
        })
        .text(“Height: Width Ratio”);
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient(‘left’);
    svg.append(‘g’)
        .attr(‘class’, ‘y axis’)
        .call(yAxis)
        .append(‘text’)
        .attr({
            “class”: “label”,
            “y”: -10
        })
        .style({
            “text-anchor”: “end”
        })
        .text(“Num Shapes”);
};

function draw_data_63dc8d12(rawData) {
    rawData.forEach(function(d) {
        return d.Shape_Count = +d.Shape_Count, d.ratio = +d[“Image_Height/Image_Width “]
    });
    draw_canvas_2e16a1dd(rawData);
}

<<<<<<< HEAD
queue().defer(d3.tsv, 'van_gogh_additional_measurements.tsv').
       .await(draw);
```
<<<<<<< HEAD
<<<<<<< HEAD
=======
Repo for emitting d3

See `ent-ex` for possible use syntax.

Next steps: 
* ~~make the scaffold for w/ data and without~~
* ~~research input language~~
* ~~add links to good examples~~
* finish skeleton_02 and test with static data
* write parser
* see [future.md](https://github.com/sarahgp/data-monster/blob/master/future.md) for more
>>>>>>> 042e761 (Update README.md)
=======
>>>>>>> 778bb27 (Remove extra lines in README)
=======

### Chomping (aka compiling) the file

To compile a data-monster `.dm` file to javascript, run
=======
queue()
    .defer(d3.tsv, ‘van_gogh_additional_measurements.tsv’)
    .await(function(err, data) {
        if (err) {
            console.log(err)
        }
        draw_data_63dc8d12(data);
    });
>>>>>>> a8b70a0 (Working on README)

```

and then you can use it like any other d3.js file you have written.


## Why would I use this?

## How do I monster?
### Installing
Eventually this will be up on NPM, but till then there are a few steps.

1. Clone data-monster repo or download the files in the data-monster folder
2. Manually add them to node_modules directory
3. Require data-monster in your package.json

```
“dependencies”: {
    “data-monster”: “0.0.1” }
```

4. Data Monster can be installed locally or globally. If you install it globally, it is a little easier to call, but whatever makes you happy.

Global
```
npm install -g node_modules/data-monster
```

Local 
```
npm install node_modules/data-monster
```

Now you’re ready to go!

### Chomping (aka compiling) the file

If you installed data monster globally, you can run

```
chomp <filename0> ... <filenameN> [optional output directory] 
```
in any directory with a `.dm` file.

Otherwise, with a local install, you can 
```
npm run chomp <.dm files>
```
<<<<<<< HEAD
>>>>>>> 97560e2 (Update read me for calling chomp)
=======

<<<<<<< HEAD
The `-a` flag can also be used to chomp all the files in the current directory
>>>>>>> d9ab7f5 (-a flag implemented)
=======
In both cases, the `-a` flag can also be used to chomp all the files in the current directory.

### Writing a Chompable File

## Why would you build this?
Entertainment & laziness, basically.

It all started in [Radical Computer Science](http://radicalcomputerscience.tumblr.com/), a class at the [School for Poetic Computation](http://sfpc.io/) where we learned to build our own LISP interpreters with [plt.js](https://github.com/nasser/pltjs) and [peg.js](http://pegjs.org/). Now that I am at Hacker School ([recently renamed the Recurse Center](https://www.recurse.com/?redirected_from_hs=true)), I have the time to build up the Monster as my own language. Target: d3. But why d3?

Thanks to the way most people learned d3.js — copying examples they liked and substituting in their own data — d3 is highly idiomatic; that is, most people write their charts similarly, even after they move past copy-paste.

At the same time, one of d3’s great virtues — it’s flexibility — means it can take a lot of code to write a chart. 

So Data Monster was born to generate the necessary d3 with as little specification from the user as possible — but without sacrificing flexibility. 

## Feedback, the Future + Contributing

That is a big goal and this is a little alpha; lots of things are broken or maybe could be better implemented. 

I plan to continue adding functionality to the Monster for the foreseeable future and am interested in both general feedback and specific requests.

Please open an issue, shoot me an email at [hi@sarahgp.com](mailto:hi@sarahgp.com), or check out the [contributing doc](/contributing.md).


## License
MIT
<<<<<<< HEAD
>>>>>>> a8b70a0 (Working on README)
=======
>>>>>>> 673eab2 (Update README.md)
