var svg,
    graph = {},
    shiftKey,
    ctrlKey,
    ctrlKeyIng,
    selected = [],
    fluxmax = 1,
    fluxmin = -1,
    concentrationmax = 1,
    concentrationmin = -1;

function loadInitialGraph() {
    linkedByIndex = {};
    graph.links.forEach(function(d) {
	linkedByIndex[d.source + "," + d.target] = true;
    });

    graph.nodes.forEach(function(d) {
        if(d.isfixed == null){d.isfixed = false}; 
        return d;}
    )

    if (typeof d3v4 == 'undefined') {d3v4 = d3};

    svg = d3.select("#d3_selectable_force_directed_graph")
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("id","graphsvg")
        .attr("viewBox","0 0 " + $(window).width() + " " + $(window).height())
        .classed("svg-content", true);

    parentWidth = d3v4.select('svg').node().parentNode.clientWidth;
    parentHeight = d3v4.select('svg').node().parentNode.clientHeight;

    // remove any previous graphs
    svg.selectAll('.g-main').remove();

    gMain = svg.append('g')

    rect = gMain.append('rect')
    .attr('width', 400*$(window).width())
    .attr('height', 400*$(window).height())
    .attr("x", -200*$(window).width())
    .attr("y", -200*$(window).height())
    .style('fill', 'white')

    gDraw = gMain.append('g')
    
    if (! ("links" in graph)) {
        console.log("Graph is missing links");
    }
    
    nodes = {};
    var i;
    for (i = 0; i < graph.nodes.length; i++) {
        nodes[graph.nodes[i].id] = graph.nodes[i];
        graph.nodes[i].weight = 1.01;
    }

    zoom = d3v4.zoom()
    .on('zoom', zoomed)

    gMain.call(zoom);

    gMain.on("dblclick.zoom", null);

    gBrushHolder = gDraw.append('g')
    
    gBrush = null;

    brushMode = false;
    brushing = false;

    brush = d3v4.brush()
        .on("start", brushstarted)
        .on("brush", brushed)
        .on("end", brushended);

    defineSimulation()

    rect.on('click', () => {

        if (ctrlKeyIng) {
            exit_highlight()
            simulation.restart()
        }

        node.each(function(d) {
            d.selected = false;
            d.previouslySelected = false;
        });
        node.classed("selected", false);
        selected = [];                   
    });

    d3v4.select('body').on('keydown', keydown);
    d3v4.select('body').on('keyup', keyup);
}


function zoomed() {
    //https://stackoverflow.com/questions/45570145/d3-v4-reset-zoom-state
    gDraw.attr('transform', d3v4.event.transform);
}

function brushed() {
    if (!d3v4.event.sourceEvent) return;
    if (!d3v4.event.selection) return;

    var extent = d3v4.event.selection;

    node.classed("selected", function(d) {
        d.selected = d.previouslySelected ^
        (extent[0][0] <= d.x && d.x < extent[1][0]
         && extent[0][1] <= d.y && d.y < extent[1][1])
         if (d.selected && selected.indexOf(d.index) == -1) {selected.push(d.index)};
         return(d.selected);
    });
}

function brushended() {
    if (!d3v4.event.sourceEvent) return;
    if (!d3v4.event.selection) return;
    if (!gBrush) return;

    gBrush.call(brush.move, null);

    if (!brushMode) {
        gBrush.remove();
        gBrush = null;
    }

    brushing = false;
}

function brushstarted() {
    brushing = true;
    typing = false;

    node.each(function(d) { 
        d.previouslySelected = shiftKey && d.selected; 
    });
}

function keydown() {
    if (d3v4.event.altKey) {d3v4.event.preventDefault();};

    shiftKey = d3v4.event.shiftKey;
    ctrlKey = d3v4.event.ctrlKey;

    if (shiftKey) {
        // if we already have a brush, don't do anything
        if (gBrush)
            return;

        brushMode = true;

        if (!gBrush) {
            gBrush = gBrushHolder.append('g');
            gBrush.call(brush);
        }
    }
}

function keyup() {
    shiftKey = false;
    brushMode = false;
    ctrlKey = false;

    if (!gBrush)
        return;

    if (!brushing) {
        // only remove the brush if we're not actively brushing
        // otherwise it'll be removed when the brushing ends
        gBrush.remove();
        gBrush = null;
    }
}

function dragstarted(d) {
    typing = false;

    if (ctrlKeyIng) {
        exit_highlight()
        simulation.restart()
    }

    dragging = true;

    if (!d3v4.event.active) simulation.alphaTarget(0.9).restart();

    if (!d.selected && !shiftKey) {
        // if this node isn't selected, then we have to unselect every other node
        node.classed("selected", function(p) {
            selected = [];
            return p.selected =  p.previouslySelected = false;
        });
    }
    
    if (d.selected && shiftKey) {
        d3v4.select(this).classed("selected", function(p) { 
            d.previouslySelected = d.selected;
            selected.splice(selected.indexOf(d.index),1);
            return d.selected = false; });
    } else {
        if (d.grouping.length == 0) {
        d3v4.select(this).classed("selected", function(p) {
                d.previouslySelected = d.selected;
                if (selected.indexOf(d.index) == -1) {selected.push(d.index)};
                return d.selected = true; 
            }) 
        } else {
            for (var j = 0; j < d.grouping.length; j++) {
                graph.nodes.forEach(function(e){
                    if (e.id == d.grouping[j]) {
                        e.selected = e.previouslySelected = true;
                        if (selected.indexOf(e.index) == -1) {selected.push(e.index)};
                    }
                })
            }
            node.classed("selected",function(d){return d.selected})
        };
    }
    
    node.filter(function(d) { return d.selected; })
    .each(function(d) { //d.fixed |= 2; 
        d.fx = d.x;
        d.fy = d.y;
    })
    
    if (document.getElementById("dialog2").style.display == "block") {editNodeProperties(d)}
}

function dragged(d) {
    if (ctrlKey) {
        return;
    }

    node.filter(function(d) { return d.selected; })
    .each(function(d) { 
        d.fx += d3v4.event.dx;
        d.fy += d3v4.event.dy;
    })
}

function dragended(d) {
    if (ctrlKey) {
        return;
    }
    if (!d3v4.event.active) simulation.alphaTarget(0);

    graph.nodes.forEach(function(d){
        if (!d.isfixed){
            d.fx = null;
            d.fy = null;
        } else {
            d.fx = d.x;
            d.fy = d.y;
        }
    })

    dragging = false;
}

function ticked() {

    simulation.force("x", d3v4.forceX(function(d){
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
    

    text.attr("x", function(d) {return d.x + d.labelshift[0];});
    text.attr("y", function(d) {return d.y + d.labelshift[1];});
    
    graph.links.forEach(function(d){
        d.rad = Math.sqrt(Math.pow(d.target.x - d.source.x,2) + Math.pow(d.target.y - d.source.y,2))
        d.refx = d.source.x + ((d.target.x - d.source.x)*(d.rad - 2.2 - d.target.r)/d.rad);
        d.refy = d.source.y + ((d.target.y - d.source.y)*(d.rad - 2.2 - d.target.r)/d.rad);
        d.bpath = "M" + d.source.x + "," + d.source.y + 
            "L" + d.refx + "," + d.refy;
    })
    checkchange = false;

    link.attr("d",function(d){return d.bpath})   

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

}

function defineSimulation() {
    //drawTexts()
    //drawShapes() 

    link = gDraw.append("g")
    .attr("class","link")
    .selectAll("line")
    .data(graph.links)
    .enter().append("svg:path")
        //.attr("class", "link")
        .style("stroke",defineLinkColor)
        .attr("fill","none")
        .attr("stroke-width",document.getElementById("strokewidth").valueAsNumber);

    node = gDraw.append("g")
    .attr("class", "node")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("fill", defineNodeColor)
    .call(d3v4.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended))
    .on("mouseover",function(d){
        if (d3v4.event.altKey){
            d.selected = true;
            d.previouslySelected = true;
            node.classed("selected",function(d){return d.selected});
            if (selected.indexOf(d.index) == -1) {selected.push(d.index)};
        } 
    })

    if (document.getElementById('hiderxns').checked) {
        link.filter(function(d) {return d.target.group == 2})
        .attr('marker-end', "url(#arrow)")
    } else {
        link.attr('marker-end', "url(#arrow)")
    } 

    centerref = gDraw.append("circle")
    .attr("cx", parentWidth/2)
    .attr("cy", parentHeight/2)
    .attr("r", document.getElementById("centersize").valueAsNumber);

    text = gDraw.append("g")
        .attr("class","labels")
        .selectAll("text")
        .data(graph.nodes)
        .enter().append("text")
        .style("font-size", document.getElementById("labelsize").value + "px")
        .attr("x",function(d){return d.x})
        .attr("y",function(d){return d.y})
        .style("text-anchor", "middle")
        .style("pointer-events","none");
    renameNodes()

    reDefineSimulationParameters()
}

function reDefineSimulation() {
    simulation.stop()
    var prevzoom = false;
    if (gDraw._groups[0][0].attributes.transform != null) {
        tmp = gDraw._groups[0][0].attributes.transform.nodeValue;
        prevzoom = true;
    }
    gDraw.remove()
    gDraw = gMain.append('g')

    gBrushHolder = gDraw.append('g')

    gBrush = null;

    brushMode = false;
    brushing = false;

    brush = d3v4.brush()
        .on("start", brushstarted)
        .on("brush", brushed)
        .on("end", brushended)
        .extent(extent);

    if (prevzoom) {gDraw.attr("transform",tmp)}

    graph.nodes.forEach(function(d) {
        if (!d.selected & !d.isfixed){
            d.fx = null;
            d.fy = null;
        }
    })

    defineSimulation()
    node.classed("selected",function(d){return d.selected})
    simulation.restart()
}




