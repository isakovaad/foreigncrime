// Pie chart script
let data = []; // Global variable to store the dataset

d3.csv("./final_translated_data_V4.csv", d => ({
    value: +d.Valeurs,
    title: d.Titre,
    statistic: d.Statistique,
    ordinates: d.Ordonnees,
    indicator: d.Indicateur,
    geographical_area: d.Zone_geographique,
})).then(csvData => {
    data = csvData; // Store the loaded data in the global variable

    // Filter for Values, rather than Rates
    const filteredData = data.filter(d => d.statistic === "Name");

    // Extract regions while excluding "France" and "Île-de-France" from the main dropdown
    const regions = Array.from(new Set(filteredData
        .map(d => d.geographical_area)
        .filter(region => region !== "France" && region !== "Ile-de-France")
    )).sort();

    // Populate the dropdown menu (datalist)
    const regionSuggestions = document.getElementById("regionSuggestions");
    regions.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        regionSuggestions.appendChild(option);
    });

    // Initialize with the first region and display it
    const defaultRegion = regions[0];
    document.getElementById("regionName").textContent = defaultRegion;
    createPieChart(filteredData.filter(d => d.geographical_area === defaultRegion), "#pie", "#legend");

    // Generate separate pie charts for France and Île-de-France with custom sizes
    createPieChart(
        filteredData.filter(d => d.geographical_area === "France"),
        "#francePie",
        "#franceLegend",
        "France",
        350, // Custom width
        350  // Custom height
    );

    createPieChart(
        filteredData.filter(d => d.geographical_area === "Ile-de-France"),
        "#ileDeFrancePie",
        "#idfLegend",
        "Île-de-France",
        350, // Smaller width
        350  // Smaller height
    );

    // Add event listener for the ZIP code click
    document.querySelectorAll(".zip-list li").forEach(item => {
        item.addEventListener("click", () => {
            const selectedRegion = item.textContent.trim(); // Get ZIP code text
            if (regions.includes(selectedRegion)) {
                updatePieChart(selectedRegion);

                // Scroll smoothly to the pie chart
                const pieChartElement = document.querySelector("#pie");
                pieChartElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            } else {
                alert("Region not found. Please select a valid region.");
            }
        });
    });
});

// General pie chart function with adjustable size
const createPieChart = (data, chartId, legendId, regionTitle = "", width = 600, height = 600) => {
    const radius = Math.min(width, height) / 2; // Adjust radius for the given width and height

    const container = d3.select(chartId).html(""); // Clear existing chart
    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Handle empty data case
    if (!data.length) {
        container.html("<p>No data available for this selection.</p>");
        return;
    }

    // Aggregate and sort data
    const aggregatedData = d3.rollups(
        data,
        v => d3.sum(v, d => d.value),
        d => d.indicator
    ).map(([key, value]) => ({ key, value }))
        .sort((a, b) => b.value - a.value);

    const totalValue = d3.sum(aggregatedData, d => d.value);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Color scale
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(aggregatedData, d => d.value)])
        .interpolator(d3.interpolateReds);

    // Draw slices
    const slices = svg.selectAll("path").data(pie(aggregatedData));

    slices.enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.value))
        .attr("stroke", "white")
        .style("stroke-width", "1px")
        .style("transition", "all 0.3s ease")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .style("opacity", 0.7)
                .style("stroke", "black");

            // Display tooltip
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "#333")
                .style("color", "#fff")
                .style("padding", "5px 10px")
                .style("border-radius", "5px")
                .style("visibility", "visible")
                .style("font-size", "12px")
                .text(`${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`);

            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", function (event) {
            d3.select(".tooltip")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function () {
            d3.select(this)
                .style("opacity", 1)
                .style("stroke", "white");

            // Remove tooltip
            d3.select(".tooltip").remove();
        })
        .append("title")
        .text(d => `${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`);

    slices.exit().remove();

    // Generate a separate legend for each pie chart
    const legend = d3.select(legendId).html(""); // Clear previous legend

    legend.selectAll("div")
        .data(aggregatedData)
        .enter()
        .append("div")
        .attr("id", d => `legend-item-${d.key.replace(/\s+/g, '-')}`)
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(d => `
            <div style="width: 10px; height: 10px; background-color: ${colorScale(d.value)}; margin-right: 8px;"></div>
            <span>${d.key}: ${(d.value / totalValue * 100).toFixed(2)}%</span>`);

    // If a title is specified, add it above the pie chart
    if (regionTitle) {
        container.insert("h3", ":first-child")
            .text(regionTitle)
            .style("text-align", "center")
            .style("color", "#333")
            .style("margin-bottom", "10px");
    }
};

function updatePieChart(department) {
    if (!data.length) {
        console.error("Data not loaded yet.");
        return;
    }

    const filteredData = data.filter(d => d.geographical_area === department);

    if (filteredData.length > 0) {
        console.log(`Updating pie chart for: ${department}`);
        document.getElementById("regionName").textContent = department;
        createPieChart(filteredData, "#pie", "#legend");
    } else {
        alert("No data available for this ZIP code.");
    }
}
