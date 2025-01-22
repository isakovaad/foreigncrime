// Load CSV and initialize pictograph chart
d3.csv("./final_translated_data_V4.csv", d => ({
    value: +d.Valeurs,
    title: d.Titre,
    statistic: d.Statistique,
    ordinates: d.Ordonnees,
    indicator: d.Indicateur,
    geographical_area: d.Zone_geographique,
})).then(data => {
    // Filter for rates
    const filteredData = data.filter(d => d.statistic === "Rate per 1000 inhabitants");

    // Aggregate data by summing values for the same region and indicator
    const aggregatedData = d3.rollups(
        filteredData,
        v => d3.sum(v, d => d.value),
        d => d.geographical_area,
        d => d.indicator
    ).flatMap(([region, indicators]) => 
        indicators.map(([indicator, totalValue]) => ({
            geographical_area: region,
            indicator: indicator,
            value: totalValue
        }))
    );

    // Extract unique regions
    const regions = Array.from(new Set(aggregatedData.map(d => d.geographical_area)))
        .filter(region => region !== "France" && region !== "Ile-de-France")
        .sort();

    // Populate dropdowns
    const dropdown1 = document.getElementById("region1");
    const dropdown2 = document.getElementById("region2");

    if (!dropdown1 || !dropdown2) {
        console.error("Error: Region dropdowns not found!");
        return;
    }

    regions.forEach(region => {
        const option1 = document.createElement("option");
        option1.value = region;
        option1.textContent = region;
        dropdown1.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = region;
        option2.textContent = region;
        dropdown2.appendChild(option2);
    });

    // Set default selected regions
    dropdown1.value = regions[0] || "";
    dropdown2.value = regions[93] || "";

    // Initial chart setup
    if (regions.length >= 2) {
        updatePictographChart(aggregatedData, regions[0], regions[93]);
    }

    // Event listener for button
    document.getElementById("updateButton").addEventListener("click", () => {
        const region1 = dropdown1.value;
        const region2 = dropdown2.value;

        if (regions.includes(region1) && regions.includes(region2)) {
            updatePictographChart(aggregatedData, region1, region2);
        } else {
            alert("Please select valid regions.");
        }
    });
});

function updatePictographChart(data, region1, region2) {
    const indicators = [
        "Homicides and attempted homicides",
        "Sexual violence",
        "Physical violence",
        "Thefts and attempted robberies with violence",
        "Burglaries and attempted burglaries",
        "Thefts and attempted thefts without violence",
        "Thefts and attempted thefts related to vehicles",
        "Willful destruction and damage",
        "Drug offences",
        "Payment fraud and scams"
    ];

    // Define icon mapping
    const iconMapping = {
        "Homicides and attempted homicides": "\uf6e2",
        "Sexual violence": "\uf556",
        "Physical violence": "\uf556",
        "Thefts and attempted robberies with violence": "\uf21b",
        "Burglaries and attempted burglaries": "\uf21b",
        "Thefts and attempted thefts without violence": "\uf21b",
        "Thefts and attempted thefts related to vehicles": "\uf5e1",
        "Willful destruction and damage": "\uf5e1",
        "Drug offences": "\uf484",
        "Payment fraud and scams": "\uf09d"
    };

    // Filter data for selected regions and indicators
    const regionData1 = data.filter(d => d.geographical_area === region1 && indicators.includes(d.indicator));
    const regionData2 = data.filter(d => d.geographical_area === region2 && indicators.includes(d.indicator));

    // Select chart container
    const chartContainer = d3.select("#pictographChart");
    if (chartContainer.empty()) {
        console.error("Error: pictographChart element not found!");
        return;
    }
    chartContainer.html(""); // Clear existing content

    // Set up chart dimensions
    const width = 1500;
    const height = 600;
    const iconSize = 20;
    const spacing = 7;
    const rowSpacing = 60;

    // Create SVG
    const svg = chartContainer.append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add labels
    indicators.forEach((indicator, i) => {
        const y = i * rowSpacing + 50;
        svg.append("text")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", "0.35em")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .text(indicator);
    });

    // Draw pictograph for each indicator
    indicators.forEach((indicator, i) => {
        const y = i * rowSpacing + 50;
        const icon = iconMapping[indicator];

        // Region 1
        const value1 = regionData1.find(d => d.indicator === indicator)?.value || 0;
        const iconCount1 = Math.ceil(value1);

        svg.selectAll(`.region1-${indicator}`)
            .data(d3.range(iconCount1))
            .enter()
            .append("text")
            .attr("class", `region1-${indicator}`)
            .attr("x", (d, j) => j * (iconSize + spacing) + 500)
            .attr("y", y)
            .attr("font-family", "FontAwesome")
            .attr("font-size", `${iconSize}px`)
            .text(icon);  // Use dynamic icon

        // Region 2
        const value2 = regionData2.find(d => d.indicator === indicator)?.value || 0;
        const iconCount2 = Math.ceil(value2);

        svg.selectAll(`.region2-${indicator}`)
            .data(d3.range(iconCount2))
            .enter()
            .append("text")
            .attr("class", `region2-${indicator}`)
            .attr("x", (d, j) => j * (iconSize + spacing) + 800)
            .attr("y", y)
            .attr("font-family", "FontAwesome")
            .attr("font-size", `${iconSize}px`)
            .text(icon);  // Use dynamic icon
    });

    // Add titles for regions
    svg.append("text")
        .attr("x", 500)
        .attr("y", 30)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(region1);

    svg.append("text")
        .attr("x", 800)
        .attr("y", 30)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(region2);
}
