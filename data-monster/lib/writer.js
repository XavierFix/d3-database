var fs        = require('fs'),
    util      = require('util'),
    _         = require('lodash'),
    pretty    = require('js-object-pretty-print').pretty, // unpacks objects
    beautify  = require('js-beautify').js_beautify,      // formats output
    guts      = require('./guts.js'),
    flags     = { tt   : false,
                  axis : false  };                      // to output companion files

function buildString(structure){

  // LISTS
  var noms = {
    // special assemblies
    data      : dataBite,
    dataList  : queueBite,
    canvas    : canvasBite,
    elem      : elemBite,
    xAxis     : _.partial(assembleAxes,'x'),
    yAxis     : _.partial(assembleAxes,'y'),
    xScale    : _.partial(assembleScales,'x'),
    yScale    : _.partial(assembleScales,'y'),
    insert    : function(arg) { return arg },
    tooltips  : assembleTooltips,

   // special processes 
    attr   : _.partial(prettyBite,".attr"),
    style  : _.partial(prettyBite,".style"),
    text   : function(arg) { return _.partial(atomicBite, ".text")(stringWrap(arg))} ,
    color  : _.partial(makeVar, "color"),
   
   //  tooltip: ttBite,
    clean  : cleanBite,
    funcs  : funcsBite,

   // shorthand events
    click     :   _.partial(eventBite, "click"),
    mouseover :   _.partial(eventBite, "mouseover"),
    mouseenter:   _.partial(eventBite, "mouseenter"),
    mouseleave:   _.partial(eventBite, "mouseleave"),
    hover     :   _.partial(eventBite, "hover"),
     
   //  process functions
   variable     : eatVars,
   'function'   : eatFuncs,
   params       : eatParams,
  },

  d3things = {
    // colors
    category10  : _.partial(assembled3things, 'pre', 'scale'),
    category20  : _.partial(assembled3things, 'pre', 'scale'),
    category20b : _.partial(assembled3things, 'pre', 'scale'),
    category20c : _.partial(assembled3things, 'pre', 'scale'),

    // axes
    linear      : _.partial(assembled3things, 'pre', 'scale'),
    log         : _.partial(assembled3things, 'pre', 'scale'),
    identity    : _.partial(assembled3things, 'pre', 'scale'),
    sqrt        : _.partial(assembled3things, 'pre', 'scale'),
    pow         : _.partial(assembled3things, 'pre', 'scale'),
    quantize    : _.partial(assembled3things, 'pre', 'scale'),
    quantile    : _.partial(assembled3things, 'pre', 'scale'),
    threshold   : _.partial(assembled3things, 'pre', 'scale'),
    time        : _.partial(assembled3things, 'post', 'scale')

  };

  // SMALL FUNCS
  function atomicBite(meth, arg){
    return meth + "(" + arg + ") \n";
  }

  function cleanBite(val){
    eval('var moo = function(d){ ' + val['function'] + '; }');
    return 'rawData.forEach(' + moo + ');';
  }

  function eventBite(type, bite){
    return atomicBite(".on", stringWrap(type) + ", " + bite['function']);
  }

  function funcsBite(val){
    return val['function'];
  }

  function prettyBite(prefix, bite){
    var bite = _.isArray(bite) ? guts.objectify(bite, {}) : bite;
    return atomicBite(prefix, pretty(bite , 4, "JSON", true))
  }
  
  function stringWrap(check){
    return _.isString(check) ? '"' + check + '"' : check;
  }

  function dExpand(toExpand, scale){
    scale ? 
        eval('var moo = function(d){ return ' + scale + '(' + toExpand + ' )}')
      : eval('var moo = function(d){ return ' + toExpand + ' }')
    return moo;
  }

  function makeVar(v, val){
    return 'var ' + v + ' = ' + process(val) + ';';
  }

  // BIG BITES
  function dataBite(bite){
    var str = "";
    str += "function draw_" + bite.name + "(rawData){";
    str +=  bite.clean ? cleanBite(bite.clean) : '';
    str += _.map(bite.children, function(c){
        return 'draw_' + c + '(rawData);'
    }).join('');
    str += '} \n\n';
    return str;
  }

  function queueBite(bite){
    var str = "";
    str += "queue()"
    str += _.map(bite, function(el){
      return ".defer(d3" + el.filetype + ", '" + el.file + "')";
    }).join('');    
    str += ".awaitAll( function(err, dataArr) { ";
    str += "if(err){ console.log(err) } ";
    str += _.map(bite, function(n, idx){
      return "draw_" + n.name + "(dataArr["+ idx + "]); } );"
    }).join('');
    return str;
  }

  function canvasBite(bite){
    // the func opened here is closed by the bracket inserted in arrange()
    var str = "function draw_" + bite.name + "(data){",
        margins = bite.margins ? 
                  assembleMargins(eatParams(bite.margins)) : 
                  { top: 0, right: 0, bottom: 0, left: 0 };
    
    bite.width   = bite.width - margins.left - margins.right;
    bite.height  = bite.height - margins.top - margins.bottom;

    str += "var margin = " + pretty(margins) + ", ";
    str += "width = " + bite.width +  ", ";
    str += "height = " + bite.height + ";";

    str+= bite.yPrim ? "var yPrime = " +  stringWrap(bite.yPrim.split('.')[1]) + ", maxY = d3.max(data, function(d){return " +  bite.yPrim + " });" : "";
    str+= bite.xPrim ? "var xPrime = " +  stringWrap(bite.xPrim.split('.')[1]) + ", maxX = d3.max(data, function(d){return " + bite.xPrim + "});" : ""; 
    str+= bite.yPrim ? "maxY = maxY + (maxY * .25); // Make it a little taller \n" : "";

    str += "var svg = d3.select('" + bite.selector + "')";
    str += ".append('svg')";
    str += ".attr('width', width  + margin.left + margin.right)";
    str += ".attr('height', height + margin.top + margin.bottom)";
    str += ".append('g')";
    str += ".attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');";
    return str;
  }

  function elemBite(bite){
    var str = "";
    str += bite.runIn ? ".append('g')" : "svg.append('g')";
    str += ".attr('class', ";
    str += (bite.elemSelect || "'elements'") + ")";
    str += ".append('" + bite.type + "')"
    str += ".attr(" + pretty(_.zipObject(_.keys(bite.req_specs), _.map(bite.req_specs, function(el){ return process(el, bite.name)})), 4, 'PRINT', true)   + ")"; // add keys into this
    str += "\n"
    return str;
  }

  // ASSEMBLERS
  function assembleAxes(type, bite){
    flags.axis = true;

    var str = "",
        orient = { x: "'bottom'", y: "'left'" },
        o = _.omit(bite, 'parent'),
        b = _.mapValues(o, function(mb){ return _.isArray(mb) ? guts.objectify(mb, {}) : mb; }),
        m = _.mapValues(b, function(ins){ return guts.isHashMap(ins) ? 
                                                _.mapValues(ins, function(mins){ return _.has(mins, 'variable') ? 
                                                      process(mins, bite.parent) 
                                                    : mins; }) 
                                                : ins; });
    str += "\n"
    str += "var " + type + "Axis = d3.svg.axis()";
    str += atomicBite(".scale", type + 'Scale');
    str += atomicBite(".orient", orient[type]) + ';';
    str += "svg.append('g')";
    str += ".attr('class','" + type + " axis')";
    str += type === 'x' ? ".attr('transform', 'translate(0,' + height + ')')" : "";
    str += ".call(" + type + "Axis )";
    str += ".append('text')";
    str += build(guts.objPairs(m)) + ';';
    return str;
  } 
  
  function assembled3things(director, label, itself){
    if(director === 'pre'){
      return 'd3.' + label + '.' + itself + '()';
    } else if (director === 'post'){
      return 'd3.' + itself + '.' + label + '()';
    } else {
      throw new Error('Cannot assemble d3things; unknown director.');
    }
  }

  function assembleEnter(type){
    var str = "";
    str += "svg.selectAll('" + type + "')"; 
    str += ".data(data)";
    str += ".enter()";
    return str;
  }

  function assembleMargins(margins){
    var obj = {};
    if (margins.length === 4){
      obj.top     = +margins[0];
      obj.right   = +margins[1];
      obj.bottom  = +margins[2];
      obj.left    = +margins[3];
    } else if (margins.length === 3){
      obj.top     = +margins[0];
      obj.right   = +margins[1];
      obj.bottom  = +margins[2];
      obj.left    = +margins[1];
    } else if (margins.length === 2){
      obj.top     = +margins[0];
      obj.right   = +margins[1];
      obj.bottom  = +margins[0];
      obj.left    = +margins[1];
    } else if (margins.length === 1){
      obj.top     = +margins[0];
      obj.right   = +margins[0];
      obj.bottom  = +margins[0];
      obj.left    = +margins[0];
    } else {
      throw new Error('Incorrect margin arity');
    }
    return obj;
  }

  function assembleScales(type, bite){
    var str   = "",
        title = type + 'Scale';

    if (!bite) {
      return str;
    } else if (bite === 'default'){
      str += "var " + title + " = ";
      (type === 'x') && (str += "d3.scale.linear().domain([0, maxX]).range([0, width])");
      (type === 'y') && (str += "d3.scale.linear().domain([0, maxY]).range([height, 0]);");  
    } else {
      var domain = eatParams(bite.domain),
          range  = eatParams(bite.range);
      str += "var " + title + " = ";
      str += eatVars(bite.scale);
      str += ".domain([" + domain[0] + ", " + domain[1] + "])";
      str += ".range([" + range[0] + ", " + range[1] + "]);";
    }

    return str;
  }

  function assembleTooltips(bite){
    flags.tt = true;

    var str = "";

    str += ".on('mouseover', function(d){";
    str += "var xPosition = event.clientX + scrollX < width - 200 ? event.clientX + scrollX : event.clientX + scrollX - 200,";
    str += "yPosition = event.clientY + scrollY + 100 > height ? event.clientY + scrollY - 25 : event.clientY + scrollY + 5,";
    str += "text = ";
    str += guts.isHashMap(bite) ? process(bite[_.keys(bite)]) :  " d[xPrime] + '; ' + d[yPrime] ";
    str+= ";";
    str+= "d3.select('#tooltip')";
    str+= ".style('left', xPosition + 'px')";
    str+= ".style('top', yPosition + 'px')";
    str+= ".select('#values')";
    str+= ".text(text);";
    str+= "d3.select('#tooltip').classed('hidden', false); })";
    str+= ".on('mouseout', function(){";
    str+= "d3.select('#tooltip').classed('hidden', true); })";
    return str;
  }


  // PROCESS FUNCS
   
  function eatVars(varObj, parent){
    return _.includes(_.keys(d3things), varObj.variable) ?
        d3things[varObj.variable](varObj.variable)
      : varObj.variable.match(/\bd\./) ?
        dExpand(varObj.variable, varObj.scale)
      : lookup(varObj.variable, parent);
  }

  function eatFuncs(funcObj){
    eval('var moo = ' + funcObj['function']);
    return moo;
  }

  function eatParams(paramsObj){
    return paramsObj.params;
  }

  function lookup(toFind, scope){
    var lookat = _.filter(_.flatten(structure), function(f){
      return  _.has(f, 'parent') && f.parent === scope;
    });

    var val = _.findLast(lookat, function(n){
      return _.includes(_.keys(n), toFind);
    });

    if (val) return val[toFind];

    var grandparent =  _.result(_.findWhere(_.flatten(structure), { name: scope }), 'parent');
    if (grandparent) return lookup(toFind, grandparent);

    throw new Error('ReferenceError: ' + toFind + ' is not defined.')
  }

<<<<<<< HEAD
  // PROCESS FUNCS
  
  function eatVars(varObj, parent){
    return _.includes(_.keys(d3things), varObj.variable) ?
      d3things[varObj.variable](varObj.variable)
      : varObj.variable.match(/\bd\./) ?
        dExpand(varObj.variable)
      : lookup(varObj.variable, parent);
  }

  function eatFuncs(funcObj, parent){
    // console.log('eatFuncs', funcObj, parent);
    return ['eatFuncs', funcObj];
  }

<<<<<<< HEAD
  // Utilty funcs (order: alpha)

  function biteBiteBite(toc, contents, str){
    var str      = str || "",
        biteName = toc.shift()
        bite     = contents[biteName]; 

    if(noms[biteName]){
      str += noms[biteName](bite, contents.parent);
    } else {
      str += defaultBite(bite, biteName) + "\n";
    }

    if (toc.length) { 
      return biteBiteBite(toc, contents, str);  
    } else {
      str += "; \n"
      return str;
    }
  }

  function eatVars(collection, parent){ // this is super confusing & wtf am I doing to collect
    var collect;

   if (_.isString(collection) || _.isNumber(collection)) {
      return collection;
    } else if (_.isArray(collection) && _.isString(collection[0])){
      return '"' +  collection[0] + '"';
    }

    _.forEach(collection, function(val, key){
      // iterate on collection and if a val is an object with property variable, replace that with the value in variable
      if(key === 'variable'){
        if (d3things[val]){
          collect = assembled3things(d3things[val], val); 
        } else {
          collect = lookup(val, parent);
        }
      } else if (typeof val === 'object' && val.hasOwnProperty('variable')){
        collect = Object.create(Object.prototype);
        if (d3things[val.variable]) {
          collect[key] = assembled3things(d3things[val.variable], val.variable); // passes pre or post as arg
        } else {
          collect[key] = lookup(val.variable, parent);
        }
      }
    });
    return collect;
  }

  function lookup(toFind, scope){

    if (choms[scope].hasOwnProperty('parent')){
      if (choms[scope].hasOwnProperty(toFind)){
        return choms[scope][toFind];
      } else {
        lookup(toFind, choms[parent]);
      }
    } else {
      console.log(toFind + ' is not defined.')
    }

  }


  function stringifyList(list, prepend, append, punc){
    var ministr = "";

    _.forEach(list, function(el){
      ministr += prepend + el + append + punc;
    });

    return ministr;
  }

  // Noms & funcs

  var noms = {
   'attr'   : attrBite,
   'style'  : styleBite,
   'tooltip': ttBite,

   // events <- add more, consider method to take other DOM methods
    'click'     :   function(args){ return eventBite(args)('click')},
    'mouseover' :   function(args){ return eventBite(args)('mouseover')},
    'mouseenter':   function(args){ return eventBite(args)('mouseenter')},
    'mouseleave':   function(args){ return eventBite(args)('mouseleave')},
    'hover'     :   function(args){ return eventBite(args)('hover')},
  }

  function attrBite(bite, parent){
    var ministr = "",
        miniobj = Object.create(Object.prototype);

    _.forEach(bite, function(el){
      miniobj[el[0]] = eatVars(el[1], parent);
    })

    return ".attr(" + pretty(miniobj, 4, "JSON") + ")"; 
  }

  function styleBite(bite, parent){
    var ministr = "",
        miniobj = Object.create(Object.prototype);

    _.forEach(bite, function(el){
      miniobj[el[0]] = eatVars(el[1], parent);
    })

    return ".style(" + pretty(miniobj, 4, "JSON") + ")"; 
  }

  function defaultBite(bite, biteName){
    return biteName + "(" + eatVars(bite) + ")";
  }

  function eventBite(bite){
    return function(type){
      return ".on('" + type + "', " + bite + ")";
    }
  }

  function ttBite (bite, parent){

    flags.tt = true;

    var pobj    = choms[parent],
        ministr = "";

    ministr+= ".on('mouseover', function(d){";
    ministr+= "var xPosition = event.clientX + scrollX < width - 200 ? event.clientX + scrollX : event.clientX + scrollX - 200,";
    ministr+= "yPosition = event.clientY + scrollY + 100 > height ? event.clientY + scrollY - 25 : event.clientY + scrollY + 5,";
    ministr+= "text = ";

    if (bite.text === 'default') {
      ministr += pobj.xPrim + " + '; ' + " + pobj.yPrim;
    } else {
      ministr += bite.text;
    }

    ministr+= ";";
    ministr+= "d3.select('#tooltip')";
    ministr+= ".style('left', xPosition + 'px')";
    ministr+= ".style('top', yPosition + 'px')";
    ministr+= ".select('#values')";
    ministr+= ".text(text);";
    ministr+= "d3.select('#tooltip').classed('hidden', false); })";
    ministr+= ".on('mouseout', function(){";
    ministr+= "d3.select('#tooltip').classed('hidden', true); })";

    return ministr;
  }

  // Mini Assemblers (listed alpha)

  function assembleAxes(type, itself){
    flags.axis = true;

    var ministr   = "",
        minitype  = type.slice(0,1),  
        inkey     = Object.keys(itself[type]);

    function innerAssemble(kind, content){
      var tinystr   = "",
          defOrient = { x: 'bottom', y: 'left' };
      
      (kind === 'scale') && (tinystr += "." + kind + "(" + (content || (minitype + _.capitalize(kind))) + ")");
      (kind === 'orient') && (tinystr += "." + kind + "('" + (content || defOrient[minitype]) + "')");
      
      return tinystr;
    }

    ministr += "var " + type + " = d3.svg.axis()";
    ministr += itself[type].hasOwnProperty('scale') ? innerAssemble('scale', itself[type].scale) : innerAssemble('scale');
    ministr += itself[type].hasOwnProperty('orient') ? innerAssemble('orient', itself[type].orient) : innerAssemble('orient');
    ministr += ";";

    ministr += "svg.append('g')";
    ministr += ".attr('class','" + minitype + " axis')";
    
    (minitype === 'x') && (ministr += ".attr('transform', 'translate(0,' + height + ')')");

    ministr += ".call(" + type + ")";
    ministr += ".append('text')";

    inkey = _.pull(inkey, 'scale', 'orient', 'parent');
    
    ministr += (biteBiteBite(inkey, itself[type]));
    

    return ministr;
  }


  function assembled3things(director, itself, inter){ // expect to use inter later
    if(director === 'pre'){
      return 'd3.scale.' + itself;
    } else if (director === 'post'){
      return 'd3.' + itself + '.scale'
    } else {
      console.log('Cannot assemble d3things; unknown director.');
    }
  }

  function assembleMaxes(itself){
    var ministr = "";
    ministr+= "var maxY = d3.max(data, function(d){return " +  itself.yPrim + " }),";
    ministr+= "maxX = d3.max(data, function(d){return " + itself.xPrim + "});"; 
    ministr+= "maxY = maxY + (maxY * .25); // Make it a little taller \n";

    return ministr;
  }

  function assembleScale(director, type, itself){
    var ministr = "";
    

    if(director === 'user'){
      var obn = itself[type + "Scale"];
      
      ministr += eatVars(obn.scale) + "()";
      ministr += ".domain([" + obn.domain.short_params[0] + ", " + obn.domain.short_params[1] + "])";
      ministr += ".range([" + obn.range.short_params[0] + ", " + obn.range.short_params[1] + "])";
      
      (type === 'x') && (ministr += ", ");
    
    } else if (director === 'default'){
      (type === 'x') && (ministr += "d3.scale.linear().domain([0, maxX]).range([0, width])");
      (type === 'y') && (ministr += "d3.scale.linear().domain([0, maxY]).range([height, 0])");  
    
    } else {
      console.log('Cannot assemble scale; unknown director.');
    }

    return ministr;

  }


  // Main Assmemblers (listed bottom to top)

  function assembleFirstAtom(key){
    var obk   = choms[key],
        inkey = Object.keys(obk),
        str   = "";

    str += "svg.selectAll('" + obk.type + "')"; 
    str += ".data(data)"; // data comes in via draw queue
    str += ".enter()";
    str += ".append('g')";
    str += ".attr('class', ";
    str += obk.elemSelect || "'elements'";
    str += ")";
    str += ".append('" + obk.type + "')";
    str += ".attr(" + pretty(eatVars(obk.req_specs, obk.parent), 4, 'PRINT', true) + ")";

    inkey = _.pull(inkey, 'parent', 'type', 'req_specs');

    // check if inkey still has length
    // if so str += results of biteBiteBite

    inkey.length && (str += biteBiteBite(inkey, obk));

    return str;

  }

  function assembleRestAtoms(keyArray){
    var str = "",
        arr = _.drop(keyArray); // drop original child atom already consumed by assembleFirstAtom

    _.forEach(arr, function(el){
      var obk = choms[el],
          inkey = Object.keys(obk);

      str += "svg.append('g')";
      str += ".attr('class', ";
      str += (obk.elemSelect || "'elements'") + ")";
      str += ".append('" + obk.type + "')"
      str += ".attr(" + pretty(eatVars(obk.req_specs, obk.parent), 4, 'PRINT', true) + ")";

      inkey = _.pull(inkey, 'parent', 'type', 'req_specs');

      // check if inkey still has length
      // if so str += results of biteBiteBite

      inkey.length && (str += biteBiteBite(inkey, obk));

    });

    return str;

  }


  // call this for each object in canvasKeys
  function assembleDrawFuncs(key){
    var str     = "",
        obk     = choms[key],
        obl     = Object.create(Object.prototype),
        inkey   = Object.keys(obk),
        margins; 

  if (obk.margins){
    margins = obk.margins.short_params;
    // process margins
    if (margins.length === 4){
      obl.top     = +margins[0];
      obl.right   = +margins[1];
      obl.bottom  = +margins[2];
      obl.left    = +margins[3];
    } else if (margins.length === 3){
      obl.top     = +margins[0];
      obl.right   = +margins[1];
      obl.bottom  = +margins[2];
      obl.left    = +margins[1];
    } else if (margins.length === 2){
      obl.top     = +margins[0];
      obl.right   = +margins[1];
      obl.bottom  = +margins[0];
      obl.left    = +margins[1];
    } else if (margins.length === 1){
      obl.top     = +margins[0];
      obl.right   = +margins[0];
      obl.bottom  = +margins[0];
      obl.left    = +margins[0];
    } else {
      console.log('Error: Incorrect margin arity');
    }
  } else {
    obl.top     = 0;
    obl.right   = 0;
    obl.bottom  = 0;
    obl.left    = 0;
  }
    

    // set data width & height to calculated versions for use in eatVars 
    
    obk.width   = obk.width - obl.left - obl.right;
    obk.height  = obk.height - obl.top - obl.bottom;

    // check for global funcs
    if(choms[obk.parent].hasOwnProperty('funcs')){
      _.forEach(choms[obk.parent].funcs, function(el){
        str += el;
      });
    }

    // open func
    str += "function draw_" + key + "(data){ ";

    // check for canvas-scoped funcs
    if(obk.hasOwnProperty('funcs')){
      _.forEach(obk.funcs, function(el){
        str += el;
      });
    }

    // canvas vars — width & height are less idiomatic / precalculated for use throughout
    str += "var margin = " + pretty(obl) + ", ";
    str += "width = " + obk.width +  ", ";
    str += "height = " + obk.height + ";";

    if(!(obk.hasOwnProperty('xScale') && obk.xScale.hasOwnProperty('domain')) || 
       !(obk.hasOwnProperty('yScale') && obk.yScale.hasOwnProperty('domain'))) {
      str += assembleMaxes(obk);
    }

<<<<<<< HEAD
<<<<<<< HEAD
    // color
    // obk.hasOwnProperty('color') && (str+=eatVars(obk.color));
=======
    // scales & maxFuncs
=======
>>>>>>> f4073a0 (Maxes populating)
    str += "var xScale = "
<<<<<<< HEAD
    str += obk.hasOwnProperty('xScale') ? assembleScale('user', 'x', obk) : assembleScale('default', 'x') + ", \n"
    str += "yScale = "
    str += obk.hasOwnProperty('yScale') ? assembleScale('user', 'y', obk) : assembleScale('default', 'y')
    str += obk.hasOwnProperty('color') ? (", \n color = " + eatVars(obk.color) + "(); \n") : ";\n"
>>>>>>> 05030d0 (Scales making, but not yet maxes)
=======
    str += obk.hasOwnProperty('xScale') ? assembleScale('user', 'x', obk) : assembleScale('default', 'x') + ", ";
    str += "yScale = ";
    str += obk.hasOwnProperty('yScale') ? assembleScale('user', 'y', obk) : assembleScale('default', 'y');
    str += obk.hasOwnProperty('color') ? (", \n color = " + eatVars(obk.color) + "();") : ";";
>>>>>>> c8b3aed (Cleaning up)

    // add in axes, if they exist
    (obk.hasOwnProperty('xAxis')) && (str += assembleAxes('xAxis', obk));
    (obk.hasOwnProperty('yAxis')) && (str += assembleAxes('yAxis', obk));  

    // add in svg
    str += "var svg = d3.select('" + obk.selector + "')";
    str += ".append('svg')";
    str += ".attr('width', width  + margin.left + margin.right)";
    str += ".attr('height', height + margin.top + margin.bottom)";
    str += ".append('g')";
    str += ".attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');";

    // first element
    obk.children.length && (str += assembleFirstAtom(obk.children[0]));

    // any other elements
    (obk.children.length) > 1 && (str += assembleRestAtoms(obk.children) + ';\n');

    // bite anything not taken care of
    inkey = _.pull(inkey, 'parent','width','height','margins','selector','color','funcs','xScale', 'yScale', 'children','xPrim','yPrim','xAxis','yAxis');  
    inkey.length && (str += biteBiteBite(inkey, obk));

    // close it up!
    str += "};"
    return str;
  }

  // call this for each object in dataKeys
  function assembleQueues(key){
    var str = "",
        obk = choms[key];

    str += "function draw_" + key + "(rawData){";

    // do data cleaning

    str += "rawData.forEach(" + obk.clean + ");";

    // call child canvases

    str += stringifyList(obk.children, 'draw_', '(rawData)', '; ') + '} \n\n';
    str += "queue().defer(d3" + obk.filetype + ", '";
    str += obk.file + "')";
    str += ".await( function(err, data) { ";
    str += "if(err){ console.log(err) } ";
    str += "draw_" + key + "(data); } );";

    return str;  

  }

  // populate output in the right order > does this need to be wrapped? probably not
  (function metaAssemble(){

      var canvasKeys = _.filter(keys, function(el){
        return el.match('canvas');
      });

      var dataKeys = _.filter(keys, function(el){
        return el.match('data');
      });

      _.forEach(canvasKeys, function(el){
        output += assembleDrawFuncs(el);
      });

      _.forEach(dataKeys, function(el){
        output +=  assembleQueues(el);
      });

      // fs.writeFile('output.js', output);

    })();
=======
=======
>>>>>>> e3b98f0 (Buncha new things including getting rid of short_params indicator)
  // WORKHORSE FUNCS
>>>>>>> 90e6c48 (New writer file begins)
  
  function process(value, parent){
    return guts.isHashMap(value) ?
        noms[_.keys(value)[0]](value, parent)
      : stringWrap(value);
  }

  function build(expressions){
    // console.log('EXPS', expressions);
    return _.map(expressions, function(exp){
      if (guts.isHashMap(exp)){
        var key = _.first(_.keys(_.omit(exp, 'parent')));
        return _.includes(_.keys(exp), 'name') ?
             noms[exp.name.split('_')[0]](exp)
           : _.includes(_.keys(noms), key) ?
             noms[key](exp[key])
           : atomicBite(key, process(exp[key], exp.parent));
      } else {
        throw new Error('Invalid input:' + exp);
      }
    }).join('');
  }

  // Do a little shuffling so we can map & join for correct order:
  // - Move data to end and create list object
  // - Create 'enter', 'color', and 'scales' objects if not explicitly created
  // - Add canvas enders
  function arrange(innerStructure){
    var colors    = _.filter(innerStructure, function(f){ return _.has(f, 'color')}),
        scales    = _.filter(innerStructure, function(f){ return _.has(f, 'xScale') ||  _.has(f, 'yScale') }), 
        scaleKeys = _.flatten(_.map(scales, _.keys)),
        canvasIdx = _.findIndex(innerStructure, function(f){ return _.has(f, 'name') && f.name.split('_')[0] === 'canvas';}),
        dataBites = _.filter(innerStructure, function(f){ return _.has(f, 'name') && f.name.split('_')[0] === 'data'; }),
        restBites = _.reject(innerStructure, function(f){ return (_.has(f, 'name') && f.name.split('_')[0] === 'data') || _.has(f, 'xScale') ||  _.has(f, 'yScale'); }),
        dataList  = _.map(dataBites, function(el){
          return { name: el.name, filetype: el.filetype, file: el.file };
        });

    if (!(colors.length)){
      restBites.splice(canvasIdx, 0, { color: {'function': function(id){ return id; }} });
    }

    if (!(_.includes(scaleKeys, 'xScale'))){
      scales.push({xScale: 'default'});
    }

    if (!(_.includes(scaleKeys, 'yScale'))){
      scales.push({yScale: 'default'});
    }

    restBites.splice(canvasIdx, 0, scales);

    if (!(_.some(_.flatten(_.map(restBites, _.keys)), function(v){return v === 'enter'}))){
      var elemIdx = _.findIndex(innerStructure, function(f){ return _.has(f, 'name') && f.name.split('_')[0] === 'elem'; });
      innerStructure[elemIdx].runIn = true; // this way we don't append 'g' in the elemBite
      restBites.splice(elemIdx - 1, 0, {insert: assembleEnter(innerStructure[elemIdx].type)});
    }

    return _.flatten(restBites.concat({insert: '}'}, dataBites, { 'dataList': dataList }));
  }


  // console.log(beautify(_.map(_.map(structure, arrange), build).join(''), {"break_chained_methods": true}));
  return beautify(_.map(_.map(structure, arrange), build).join(''), {"break_chained_methods": true});
}

exports.string  = buildString;
exports.flags   = flags;
