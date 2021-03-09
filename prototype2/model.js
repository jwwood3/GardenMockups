class Model {
    constructor() {
        this.variableMap = {};
        this.variableDesc = [];
        this.originalDataLists = {};
        this.blockDataLists = {};
        this.tractDataMaps = {};
        this.geojsonInstances = {};
    }

    getVariables() {
        return this.variableDesc;
    }

    getUnits(variableName) {
        console.log(this.variableMap[variableName]);
        return this.variableMap[variableName]['unit'];
    }

    getOriginalData(key) {
        if (key in this.originalData)
            return this.originalData[key];
        return [];
    }

    getBlockData(key) {
        if (key in this.blockDataLists)
            return this.blockDataLists[key];
        return [];
    }

    getTractData(key) {
        console.log("Getting tract data...");
        console.log(this.tractDataMaps);
        if (key in this.tractDataMaps)
            return this.tractDataMaps[key];
        console.log("Tract data key " + key + " not found");
        return {};
    }

    getColorMapping(key) {
        let minmax = this._getMinMax(key);
        let min = minmax[0];
        let max = minmax[1];
        let diff = max - min;
        return function (d) {
            return d > (min + diff * 7.0 / 8.0)  ? '#800026' :
                   d > (min + diff * 6.0 / 8.0)  ? '#BD0026' :
                   d > (min + diff * 5.0 / 8.0)  ? '#E31A1C' :
                   d > (min + diff * 4.0 / 8.0)  ? '#FC4E2A' :
                   d > (min + diff * 3.0 / 8.0)  ? '#FD8D3C' :
                   d > (min + diff * 2.0 / 8.0)  ? '#FEB24C' :
                   d > (min + diff * 1.0 / 8.0)  ? '#FED976' :
                                                   '#FFEDA0';
        }
    }

    getGeoJson(key) {
        if (key in this.geojsonInstances) {
            return this.geojsonInstances[key];
        }
        return null;
    } 

    setGeoJson(key, geojson) {
        this.geojsonInstances[key] = geojson;
    }

    removeData(key) {
        delete this.originalDataLists[key];
        delete this.blockDataLists[key];
        delete this.tractDataMaps[key];
        delete this.geojsonInstances[key];
    }

    async fetchVariables() {
        const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/variables");
        const variables = await response.json();
        for (let i=0; i<variables.length; i++) {
            let desc = variables[i]['desc'] + ' (' + variables[i]['name'] + ')';
            this.variableDesc.push(desc);
            this.variableMap[desc] = variables[i];
        }
    }

    async fetchData(key, variableName) {
        let variable = this.variableMap[variableName]['name'];
        const response = await fetch("https://src.cals.arizona.edu/api/v1/scrutinizer/measurements?variable=" + variable);
        const data = await response.json();
        this.originalDataLists[key] = data;
        await this._createBlockData(key, data);
        await this._createTractDataMap(key);     
    }

    async _createBlockData(key, data) {
        let blockData = [];
        for (let i=0; i<data.length; i++) {
            if (data[i]['location_type'] === 'block_group' || data[i]['location_type'] === 'census_block') {
                if (data[i]['location_name'][0] !== '0') {
                    data[i]['location_name'] = '0' + data[i]['location_name'];
                }
                blockData.push(data[i]);
            } else if (data[i]['location_type'] === 'centroid' || data[i]['location_type'] === 'point') {
                // let newData = JSON.parse(JSON.stringify(data[i]));
                // newData['location_type'] = 'block_group';
                // let coord = data[i]['location_name'].split(",");
                // await fetch("https://geo.fcc.gov/api/census/area?lat=" + coord[0] + "&lon=" + coord[1])
                //     .then((response) => response.json())
                //     .then((response) => {
                //         let value = response['results'][0]['block_fips'];
                //         value = value.slice(0, 12);
                //         newData['location_name'] = value;
                //         blockData.push(newData);
                //     });
            }
        }
        this.blockDataLists[key] = blockData;
    }

    async _createTractDataMap(key) {
        console.log("Creating Tract Data!");
        if (!(key in this.blockDataLists)) {
            console.log("Error in getBlockDataMap, " + key + " is not present.");
            return -1;
        }
        let data = this.blockDataLists[key];
        let tractData = {};
        for (let i=0; i<data.length; i++) {
            let tractId = data[i]['location_name'].slice(0, 11); // Organized as tracts, not block groups
            let value = parseFloat(data[i]['value']);
            if (!(tractId in tractData)) {
                tractData[tractId] = [0, 0];
            }
            tractData[tractId][0] += value; // Current sum of values in the tract
            tractData[tractId][1] += 1;     // Current num of values in the tract
    
        }
        this.tractDataMaps[key] = tractData;
    }

    _getMinMax(key) {
        if (!(key in this.tractDataMaps)) {
            return [-1, -1];
        }
        let min = Number.MAX_VALUE;
        let max = Number.MIN_SAFE_INTEGER;
        let tractMap = this.tractDataMaps[key];
        for (var tractId in tractMap) {
            let avg = tractMap[tractId][0] / tractMap[tractId][1];
            if (avg < min) {
                min = avg;
            }
            if (max < avg) {
                max = avg;
            }
        }
        return [min, max];
    }
}