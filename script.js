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
    d3.csv("./filtered_data_no_france.csv")
]).then(([geojson, data]) => {
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
    const crimeTypes = Array.from(new Set(data.map(d => d.Indicateur)));
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

    function updateMap(crimeType) {
        // Reset crime data for each GeoJSON feature
        geojson.features.forEach(feature => {
            feature.properties.crime = 0;
            feature.properties.labels = []; // Reset labels array
        });

        // Assign crime data and ZIP codes as labels from CSV to GeoJSON features
        data.forEach(d => {
            if (d.Indicateur === crimeType) {
                const department = d.Zone_geographique; // Full label (e.g., "75-Paris")
                const zipCode = department.split("-")[0]; // Extract ZIP code (e.g., "75")

                const region = Object.keys(regionMapping).find(r => regionMapping[r].includes(department)); // Match department to region

                if (region) {
                    const feature = geojson.features.find(f => f.properties.nom === region); // Match region in GeoJSON
                    if (feature) {
                        feature.properties.crime += +d.Valeurs; // Accumulate crime data
                        if (!feature.properties.labels.includes(zipCode)) {
                            feature.properties.labels.push(zipCode); // Add only if the ZIP code is unique
                        }
                    }
                } else {
                    console.warn("No region found for department:", department);
                }
            }
        });

        const maxCrime = Math.max(...geojson.features.map(f => f.properties.crime));
        colorScale.domain([0, maxCrime]);

        // Draw main map regions
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
                document.getElementById(`region-${d.properties.nom.replace(/\s+/g, "-")}`).scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            });

        // Render labels for each region
        renderRegionLabels();
        renderRegionMaps();
    }

    function renderRegionLabels() {
        // Clear and redraw labels
        svg.selectAll(".region-label")
            .data(geojson.features.flatMap(feature => {
                // Generate one object per label with its own feature reference
                return feature.properties.labels.map(label => ({
                    feature: feature,
                    label: label
                }));
            }))
            .join("text")
            .attr("class", "region-label")
            .attr("transform", d => {
                const centroid = path.centroid(d.feature); // Find centroid
                const offset = 90; // Offset to avoid overlap
                const randomX = centroid[0] + (Math.random() * offset - offset / 2);
                const randomY = centroid[1] + (Math.random() * offset - offset / 2);
                return `translate(${randomX}, ${randomY})`;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text(d => d.label) // Display individual ZIP code
            .style("font-size", "16px") // Larger font size for visibility
            .style("font-weight", "bold") // Make font bold
            .style("fill", "black")
            .style("pointer-events", "none"); // Prevent labels from blocking interactivity
    }

    function renderRegionMaps() {
        regionMapsContainer.selectAll("*").remove(); // Clear previous maps

        geojson.features.forEach(feature => {
            const regionName = feature.properties.nom || "Unknown Region";

            const regionMapContainer = regionMapsContainer.append("div")
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
        });
    }

    // Initialize map with the first crime type
    updateMap(crimeTypes[0]);
}).catch(error => {
    console.error("Unhandled error in Promise:", error);
});
