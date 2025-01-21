const width = 1000; // Main map dimensions
const height = 800;

const svg = d3.select("#choropleth")
    .attr("width", width)
    .attr("height", height);

const projection = d3.geoMercator()
    .center([2.2137, 46.2276]) // Center on France
    .scale(3000) // Adjust scale to fit the SVG dimensions
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const colorScale = d3.scaleSequential(d3.interpolateReds);

Promise.all([
    d3.json("./regions.geojson"),
    d3.csv("./final_translated_data_V4.csv")
]).then(([geojson, data]) => {
     // Filter out rows where Zone_geographique is "Île-de-France" or "France"
    const filteredData = data.filter(d => d.Zone_geographique !== "Ile-de-France" && d.Zone_geographique !== "France");
    // Region-to-department mapping
    const regionMapping = {
        "Île-de-France": ["75-Paris", "77-Seine-et-Marne", "78-Yvelines", "91-Essonne", "92-Hauts-de-Seine", "93-Seine-Saint-Denis", "94-Val-de-Marne", "95-Val-d'Oise"],
        "Auvergne-Rhône-Alpes": ["01-Ain", "03-Allier", "07-Ardèche", "15-Cantal", "26-Drome", "38-Isere", "42-Loire", "43-Haute-Loire", "63-Puy-de-Dome", "69-Rhône", "73-Savoie", "74-Haute-Savoie"],
        "Normandie": ["14-Calvados", "27-Eure", "50-Manche", "61-Orne", "76-Seine-Maritime"],
        "Bretagne": ["22-Côtes-d'Armor", "29-Finistère", "35-Ille-et-Vilaine", "56-Morbihan"],
        "Grand Est": ["08-Ardennes", "10-Dawn", "51-Marne", "52-Haute-Marne", "54-Meurthe-et-Moselle", "55-Meuse", "57-Moselle", "67-Bas-Rhin", "68-Haut-Rhin", "88-Vosges"],
        "Nouvelle-Aquitaine": ["16-Charente", "17-Charente-Maritime", "19-Correze", "23-Creuse", "24-Dordogne", "33-Gironde", "40-Landes", "47-Lot-et-Garonne", "64-Pyrenees-Atlantiques", "79-Deux-Sèvres", "86-Vienna", "87-Haute-Vienne"],
        "Occitanie": ["09-Ariège", "11-Hear", "12-Aveyron", "30-Gard", "31-Haute-Garonne", "32-Gers", "34-Hérault", "46-Lot", "48-Lozere", "65-Hautes-Pyrenees", "66-Pyrenees-Orientales", "81-Tarn", "82-Tarn-et-Garonne"],
        "Hauts-de-France": ["02-Aisne", "59-Nord", "60-Oise", "62-Pas-de-Calais", "80-Somme"],
        "Provence-Alpes-Côte d'Azur": ["04-Alpes-de-Haute-Provence", "05-Hautes-Alpes", "06-Alpes-Maritimes", "13-Bouches-du-Rhône", "83-Was", "84-Vaucluse"],
        "Pays de la Loire": ["44-Loire-Atlantique", "49-Maine-et-Loire", "53-Mayenne", "72-Sarthe", "85-Vendee"],
        "Bourgogne-Franche-Comté": ["21-Côte-d'Or", "25-Doubs", "39-Jura", "58-Nièvre", "70-Haute-Saone", "71-Saone-et-Loire", "89-Yonne", "90-Territory of Belfort"],
        "Centre-Val de Loire": ["18-Cher", "28-Eure-et-Loir", "36-Inner", "37-Indre-et-Loire", "41-Loir-et-Cher", "45-Loiret"],
        "Corse": ["2A-Southern Corsica", "2B-Haute-Corse"]
    };

    const crimeTypeSelector = d3.select("#crimeTypeSelector");

    // Populate dropdown with crime types
    const crimeTypes = Array.from(new Set(filteredData.map(d => d.Indicateur)));
    crimeTypeSelector.selectAll("option")
        .data(crimeTypes)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    crimeTypeSelector.on("change", function () {
        updateMap(this.value);
    });

    const regionMapsContainer = d3.select("#region-maps");

    // Manually defined label positions (based on visual inspection and adjustment)
    const manualLabelPositions = {
        "Île-de-France": [[505, 200], [523, 186], [490, 220], [530, 240], [520, 220], [540, 200],  [550, 220], [480, 190]],
        "Auvergne-Rhône-Alpes": [[680, 410], [600, 490], [550, 470], [680, 480], [640, 450], [720, 450], [550, 430], [600, 420], [650, 500]],
        "Normandie": [[400, 210], [430, 140], [380, 180], [340, 180], [420, 180]],
        "Bretagne": [[250, 235], [175, 240], [300, 240], [250, 270]],
        "Grand Est": [[620, 145], [610, 240], [600, 192], [665, 255], [670, 210], [675, 165], [720, 200], [770, 195], [750, 250]],
        "Nouvelle-Aquitaine": [[400, 380], [370, 420], [425, 430], [470, 420], [420, 490], [360, 470], [340, 550], [400, 540], [340, 610]],
        "Occitanie": [[420, 600], [460, 620], [510, 650], [500, 610], [480, 570], 
        [600, 575], [550, 600], [480, 535], [555, 545]],
        "Hauts-de-France": [[575, 120], [540, 90], [520, 150], [500, 50], [500, 100]],
        "Provence-Alpes-Côte d'Azur": [[720, 550], [720, 520], [750, 570], [655, 590], [710, 600], [680, 570]],
        "Pays de la Loire": [[300, 310], [350, 320], [350, 250], [390, 270], [310, 350]],
        "Bourgogne-Franche-Comté": [[655, 318], [705, 325], [680, 360], [580, 330], [710, 285], [610, 370], [580, 290], [560, 250]],
        "Centre-Val de Loire": [[515, 340], [460, 250], [460, 360], [420, 320], [470, 300], [510, 280]],
        "Corse": [[860, 715], [860, 680]]
    };


    function updateMap(crimeType) {
        geojson.features.forEach(feature => {
            feature.properties.crime = 0;
        });

        filteredData.forEach(d => {
            if (d.Indicateur === crimeType) {
                const department = d.Zone_geographique;
                const region = Object.keys(regionMapping).find(r => regionMapping[r].includes(department));
                if (region) {
                    const feature = geojson.features.find(f => f.properties.nom === region);
                    if (feature) {
                        feature.properties.crime += +d.Valeurs;
                    }
                }
            }
        });

        const maxCrime = Math.max(...geojson.features.map(f => f.properties.crime));
        colorScale.domain([0, maxCrime]);

        svg.selectAll("path")
            .data(geojson.features)
            .join("path")
            .attr("d", path)
            .attr("fill", d => colorScale(d.properties.crime))
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .on("mouseover", event => {
                d3.select(event.currentTarget)
                    .attr("stroke", "black")
                    .attr("stroke-width", 3);
            })
            .on("mouseout", event => {
                d3.select(event.currentTarget)
                    .attr("stroke", "white")
                    .attr("stroke-width", 1);
            })
            .on("click", function (event, d) {
                const regionId = `region-${d.properties.nom.replace(/\s+/g, "-")}`;
                const regionElement = document.getElementById(regionId);

                // Highlight the clicked region map
                d3.selectAll(".region-map").classed("highlighted", false);
                d3.select(regionElement).classed("highlighted", true);

                // Scroll to the region map
                regionElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            });

        renderRegionLabels();
        renderRegionMaps();
    }

    function renderRegionLabels() {
        svg.selectAll(".region-label")
            .data(Object.entries(manualLabelPositions).flatMap(([region, labels]) => labels.map((position, index) => ({
                region,
                zip: regionMapping[region][index].split("-")[0],
                title: regionMapping[region][index], // Extract title from the mapping (e.g., "Paris")
                x: position[0],
                y: position[1]
            }))))
            .join("text")
            .attr("class", "region-label")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .attr("dy", ".40em")
            .attr("text-anchor", "middle")
            .text(d => d.zip) // Display ZIP code
            .attr("title", d => d.title) // Add the title for hover
            .style("font-size", d => d.region === "Île-de-France" ? "16px" : "20px")
            .style("font-weight", "bold")
            .style("fill", d => d.region === "Île-de-France" ? "white" : "black")
            .style("pointer-events", "all") // Allow hover interaction
            .on("mouseover", function (event, d) {
                // Create a tooltip on hover
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("background", "rgba(0, 0, 0, 0.7)")
                    .style("color", "white")
                    .style("padding", "10px 20px")
                    .style("border-radius", "5px")
                    .style("pointer-events", "none")
                    .style("font-size", "20px")
                    .text(d.title);
    
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`)
                    .style("visibility", "visible");
            })
            .on("mousemove", function (event) {
                // Move tooltip with the cursor
                d3.select(".tooltip")
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY + 10}px`);
            })
            .on("mouseout", function () {
                // Remove tooltip on mouseout
                d3.select(".tooltip").remove();
            });
    }
    
    
    

    function renderRegionMaps() {
        regionMapsContainer.selectAll("*").remove();
    
        geojson.features.forEach(feature => {
            const regionName = feature.properties.nom || "Unknown Region";
    
            // Create a container for each region map and zip code list
            const regionContainer = regionMapsContainer.append("div")
                .attr("class", "region-container");
    
            // Create the region map container (left side)
            const regionMapContainer = regionContainer.append("div")
                .attr("class", "region-map")
                .attr("id", `region-${regionName.replace(/\s+/g, "-")}`);
    
            regionMapContainer.append("h4").text(regionName);
    
            const regionSvg = regionMapContainer.append("svg")
                .attr("viewBox", "0 0 400 400")
                .attr("preserveAspectRatio", "xMidYMid meet");
    
            const bounds = path.bounds(feature);
            const width = bounds[1][0] - bounds[0][0];
            const height = bounds[1][1] - bounds[0][1];
            const scale = Math.min(350 / width, 350 / height);
            const xOffset = (400 - width * scale) / 2 - bounds[0][0] * scale;
            const yOffset = (400 - height * scale) / 2 - bounds[0][1] * scale;
    
            regionSvg.append("path")
                .datum(feature)
                .attr("d", path)
                .attr("transform", `translate(${xOffset}, ${yOffset}) scale(${scale})`)
                .attr("fill", colorScale(feature.properties.crime || 0))
                .attr("stroke", "#333")
                .attr("stroke-width", 1);
    
            // Create the ZIP code list container (right side)
            const zipListContainer = regionContainer.append("div")
                .attr("class", "zip-list");
    
            zipListContainer.append("h4").text("ZIP Codes");
    
            // Populate the list of ZIP codes
            const zipCodes = regionMapping[regionName] || [];
            const ul = zipListContainer.append("ul");
    
            zipCodes.forEach(zip => {
                ul.append("li").text(zip);
            });
        });
    }
    

    updateMap(crimeTypes[0]);
}).catch(error => {
    console.error("Unhandled error in Promise:", error);
});
