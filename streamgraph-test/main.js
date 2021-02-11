(function () {
    // first, load the dataset from a CSV file
    d3.csv('Los_Angeles_International_Airport_-_Passenger_Traffic_By_Terminal.csv')
        .then(data => {
            // log csv in browser console
            console.log(data);

            var advanceVisData = {};
            var airport = new Set();


            data.forEach(d => {
                airport.add(d['Terminal']);
                var period = new Date(d['ReportPeriod']);
                if (period in advanceVisData) {
                    if (d['Terminal'] in advanceVisData[period]) {
                        advanceVisData[period][d['Terminal']] += Number(d['Passenger_Count']);
                    }
                    else {
                        advanceVisData[period][d['Terminal']] = Number(d['Passenger_Count']);
                    }
                }
                else {
                    advanceVisData[period] = {};
                    advanceVisData[period][d['Terminal']] = Number(d['Passenger_Count']);
                }
            });

            console.log(airport);
            console.log(advanceVisData);
          

            // reformat the advanceVisData for d3.stack()
            var formattedData = [];
            Object.keys(advanceVisData).forEach(d => {
                var item = {};
                item['year'] = d;
                airport.forEach(terminal => {
                    if (terminal in advanceVisData[d]) {
                        item[terminal] = advanceVisData[d][terminal];
                    } else {
                        item[terminal] = 0;
                    }
                });
                formattedData.push(item);
            });
            console.log(formattedData);


            /*********************************
             * Visualization codes start here
             * ********************************/

            var width = 1200;
            var height = 400;
            var margin = { left: 60, right: 20, top: 20, bottom: 60 };
            //set the dimensions and margins of the graph



            // append the svg object to the body of the page
            var svg = d3.select('#container')
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // List of groups = header of the csv files
            var keys = Array.from(airport);

            //stack the data?
            var stackedData = d3.stack()
                //.offset(d3.stackOffsetSilhouette)
                .keys(keys)
                (formattedData);
            console.log(stackedData);
            var max_val = 0;
            var min_val = 0;
            stackedData.forEach(terminal => {
                terminal.forEach(year => {
                    if (year[0] < min_val) min_val = year[0];
                    if (year[1] < min_val) min_val = year[1];
                    if (year[0] > max_val) max_val = year[0];
                    if (year[1] > max_val) max_val = year[1];
                })
            });
            //console.log(max_val, min_val);

            // Add X axis

            var x = d3.scaleTime()
                .domain(d3.extent(formattedData, function (d) {
                    return new Date(d.year);
                }))
                .range([0, width]);


            var xAxis = svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(20));


            // Add Y axis
            var y = d3.scaleLinear()
                .domain([min_val, max_val])
                .range([height, 0]);
            var yAxis = svg.append("g")
                .call(d3.axisLeft(y));

            // color palette
            var color = d3.scaleOrdinal()
                .domain(keys)
                .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#f781bf', "#87sbf", "#ff981bf","#d6a3b6", '#b3afb0', '#ddd8c2']);


            // create a tooltip
            var Tooltip = svg
                .append("text")
                .attr("x", 0)
                .attr("y", 0)
                .style("opacity", 0)
                .style("font-size", 17)



            // Show the areas
            var stream = svg.append("g")
            stream
                .selectAll("mylayers")
                .data(stackedData)
                .enter()
                .append("path")
                .attr("class", "myStreamArea")
                .style("fill", function (d) {
                    return color(d.key);
                })
                .style("opacity", 1)
                .attr("d", d3.area()
                    .x(function (d) {
                        return x(new Date(d.data.year));
                    })
                    .y0(function (d) {
                        return y(d[0]);
                    })
                    .y1(function (d) {
                        return y(d[1]);
                    })
                );

            // Set the zoom and Pan features: how much you can zoom, on which part, and what to do when there is a zoom
            var zoom = d3.zoom()
                .scaleExtent([.5, 20])  // This control how much you can unzoom (x0.5) and zoom (x20)
                .extent([[0, 0], [width, height]])
                .on("zoom", updateChart);

            // This add an invisible rect on top of the chart area. This rect can recover pointer events: necessary to understand when the user zoom
            svg.append("rect")
                .attr("width", width)
                .attr("height", height)
                .style("fill", "none")
                .style("pointer-events", "all")
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .call(zoom);
            // now the user can zoom and it will trigger the function called updateChart

            // A function that updates the chart when the user zoom and thus new boundaries are available
            function updateChart() {

                // recover the new scale
                var transform = d3.zoomTransform(this);
                var newX = transform.rescaleX(x);
                var newY = transform.rescaleY(y);
                // var newX = d3.event.transform.rescaleX(x);
                // var newY = d3.event.transform.rescaleY(y);

                // update axes with these new boundaries

                xAxis.call(d3.axisBottom(newX))
                yAxis.call(d3.axisLeft(newY))


                stream
                    .selectAll("mylayers")
                    .attr("d", d3.area()
                        .x(function (d) {
                            return newX(new Date(d.data.year));
                        })
                        .y0(function (d) {
                            return newY(d[0]);
                        })
                        .y1(function (d) {
                            return newY(d[1]);
                        }));
            }


           // Three function that change the tooltip when user hover / move / leave a cell
            var mouseover = function (d) {
                Tooltip.style("opacity", 1)
                d3.selectAll(".myArea").style("opacity", .3)
                d3.select(this)
                    .style("stroke", "black")
                    .style("opacity", 1)
            }
            var mousemove = function (d, i) {
                Tooltip.text(i.key);

                // grp = keys[i]
                // Tooltip.text(grp)
            }
            var mouseleave = function (d) {
                Tooltip.style("opacity", 0)
                d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
            }



            // Show the areas
            svg
                .selectAll("mylayers")
                .data(stackedData)
                .enter()
                .append("path")
                .attr("class", "myArea")
                .style("fill", function (d) {
                    // console.log(x(d.data.year), y(d[0]), y(d[1]));
                    return color(d.key);
                })
                .attr("d", d3.area()
                    .x(function (d) { return x(new Date(d.data.year)); })
                    .y0(function (d) { return y(d[0]); })
                    .y1(function (d) { return y(d[1]); })
                );

        })
})();
