function newnodetemp(id,group) {
    return {
        concentration: null,
        flux: null,
        fx: null,
        fy: null,
        group: group,
        id: id,
        idname: id,
        index: graph.nodes.length,
        isfixed: false,
        name: id,
        secondary: false,
        trap: -1,
        weight: 1.01,
        labelshift: [0,0],
        bezi: [null, null, null, null],
        selected: false,
        previouslySelected: false,
        grouping: [],
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
    }
}

function nodedegree(){
    graph.nodes.forEach(function(d){d.degree = 0})
    graph.links.forEach(function(d){
        graph.nodes[d.source.index].degree++
        graph.nodes[d.target.index].degree++
    })
    graph.nodes.forEach(function(d){
        d.r = (Math.sqrt(d.degree) + 5)*document.getElementById("nodescale").valueAsNumber;
        if (d.secondary) {d.r = Math.sqrt(d.r)}
    })
}

function color(n){
    if (n==1) {return document.getElementById("rxncolor").value}
    if (n==2) {return document.getElementById("metcolor").value}
    if (n==3) {return document.getElementById("fixrxncolor").value}
    if (n==4) {return document.getElementById("fixmetcolor").value}
    if (n==5) {return document.getElementById("addednodecolor").value}
    if (n==6) {return document.getElementById("edgecolor").value}
    if (n==7) {return "#d62728"}
    if (n==8) {return "#ff9896"}
}

function rgbToHex(vec) {
    return "#" + ((1 << 24) + (vec[0] << 16) + (vec[1] << 8) + vec[2]).toString(16).slice(1);
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16),parseInt(result[2], 16),parseInt(result[3], 16)]
}

function reDefineSimulationParameters() {
    simulation = d3v4.forceSimulation()
        .force("link", d3v4.forceLink()
            .id(function(d) { return d.id; })
            //.distance(document.getElementById("linkstrength").valueAsNumber))
            .distance(function(d){
                if (d.source.group == 1) {
                    if (!d.target.secondary) {return document.getElementById("linkstrength").valueAsNumber;}
                    var rx = d.source;
                } else {
                    if (!d.source.secondary) {return document.getElementById("linkstrength").valueAsNumber;}
                    var rx = d.target;
                }
                if (rx.bezi[0] == null) {
                    return document.getElementById("linkstrength").valueAsNumber;
                } else {
                    return (document.getElementById("linkstrength").valueAsNumber/30)*1.3*Math.sqrt(Math.pow(rx.bezi[0],2) + Math.pow(rx.bezi[1],2))
                }
            }))
        .force("charge", d3v4.forceManyBody()
            .distanceMax(500)
            .strength(-document.getElementById("maparea").valueAsNumber))
        .force("x", d3v4.forceX(function(d){
            if (d.secondary){
                return d.relposfunx;
            } else {
                return parentWidth/2
            }
        }).strength(function(d) {
            if (d.secondary){
                if (d.relposfunx == null) {
                    return 0;
                } else {
                    return document.getElementById("secondarystrength").valueAsNumber
                }
            } else {
                return document.getElementById("centerstrength").valueAsNumber
            }
        }))
        .force("y", d3v4.forceY(function(d){
            if (d.secondary){
                return d.relposfuny;
            } else {
                return parentHeight/2
            }
        }).strength(function(d) {
            if (d.secondary){
                if (d.relposfuny == null) {
                    return 0;
                } else {
                    return document.getElementById("secondarystrength").valueAsNumber
                }
            } else {
                return document.getElementById("centerstrength").valueAsNumber
            }
        }))

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    linkedByName = {};
    graph.links.forEach(function(d) {
    linkedByName[d.source.idname + "," + d.target.idname] = true;
    });

    linkedByID = {};
    graph.links.forEach(function(d) {
    linkedByID[d.source.id + "," + d.target.id] = true;
    });

    nodedegree()

    node.attr("r", function(d){
        return d.r;
    })
    manageArrows()
    simulation.force('collision', d3.forceCollide().radius(function(d){
        if (d.secondary) {
            return d.r*d.r + document.getElementById("nodestrength").valueAsNumber
        } else {
            return d.r + document.getElementById("nodestrength").valueAsNumber
        }
    }));
}

function defineNodeColor(d) {
    if (d.group == 1) {
        if (d.flux >= fluxmax) {
            return document.getElementById("edgemax").value
        } else if (d.flux <= fluxmin) {
            return document.getElementById("edgemin").value
        } else if (d.flux == null) {
            return color(d.group + d.isfixed*2);
        } else {
            return defineFluxColor(d.flux)
        }
    } 
    if (d.group == 2) {
        if (d.concentration >= concentrationmax) {
            return document.getElementById("metmax").value
        } else if (d.concentration <= concentrationmin) {
            return document.getElementById("metmin").value
        } else if (d.concentration == null) {
            return color(d.group + d.isfixed*2);
        } else {
            return defineFluxColorMet(d.concentration)
        }
    } 
    return color(d.group);
}
function reDefineColors() {
    node.attr("fill", defineNodeColor)
    link.style("stroke",defineLinkColor)
}
function defineLinkColor(d){
    if (d.flux == null) {
        return color(6)
    } else if (d.flux >= fluxmax) {
        return document.getElementById("edgemax").value
    } else if (d.flux <= fluxmin) {
        return document.getElementById("edgemin").value
    } else {
        return defineFluxColor(d.flux)
    }
}
function defineFluxColor(val) {
    for (var i = 0; i < rxncolorbreaks.length; i++) {if (val < rxncolorbreaks[i]) {break}}
    var col = [];
    for (var j = 0; j < 3; j++) {
        col.push(Math.round(rxncolor[i-1][j] + (rxncolor[i][j] - rxncolor[i-1][j]) * ((val - rxncolorbreaks[i-1]) /(rxncolorbreaks[i] - rxncolorbreaks[i-1]))))
    }
    return rgbToHex(col)
}
function defineFluxColorMet(val) {
    for (var i = 0; i < metcolorbreaks.length; i++) {if (val < metcolorbreaks[i]) {break}}
    var col = [];
    for (var j = 0; j < 3; j++) {
        col.push(Math.round(metcolor[i-1][j] + (metcolor[i][j] - metcolor[i-1][j]) * ((val - metcolorbreaks[i-1]) /(metcolorbreaks[i] - metcolorbreaks[i-1]))))
    }
    return rgbToHex(col)
}

function renameNodes() {
    text.text(function(d) { 
        if (d.group == 2) {
            if (document.getElementById("metNameOpts").value == "") {
                return d.idname;
            } else {
                return d[document.getElementById("metNameOpts").value];
            }
        } else {
            if (document.getElementById("rxnNameOpts").value == "") {
                return d.idname;
            } else {
                return d[document.getElementById("rxnNameOpts").value];
            }
        }; 
    })
}

function manageArrows() {
    if (document.getElementById("arrows").checked) {
        arrows = gDraw.append("svg:defs")
        .attr("class","arrows")
        .append("svg:marker")
           .attr("id", "arrow")
           .attr("viewBox", "0 -5 10 10")
           .attr("refX", 3)
           .attr("refY", 0)
           .attr("markerWidth", 5)
           .attr("markerHeight", 5)
           .attr("orient", "auto")
       .append("svg:path")
           .attr("d", "M0,-3L6,0L0,3");
   } else if (arrows) {
       arrows.attr("markerWidth", 0)
       .attr("markerHeight", 0)
   }
   if (link && node) {ticked()}
}