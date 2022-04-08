import { readFile as readXlsx, utils } from "xlsx";
import { createConnection } from "mysql";
import { readFileSync } from "fs";

const fileName = "places.xlsx";
const file = readXlsx(fileName);

let places: Place[] = [];
let inserted = 0;

file.SheetNames.forEach((value, index, array) => {
	utils.sheet_to_json(file.Sheets[value]).forEach((value, index, array) => {
		const data = <PlaceRaw>value;

		for (let [key, value] of Object.entries(data))
			// @ts-ignore
			if (typeof data[key] === "string")
				// @ts-ignore
				data[key] = value.trim();


		const place: Place = {
			id:             null,
			sector:         <Sector>data.sector,
			name:           data.name,
			rating:         parseFloat(data.rating) || 0,
			workingHours:   data.wrkh || "",
			address:        data.address,
			specialization: data.spec || "",
			phone:          data.phone || "",
			hasAlcohol:     ( data.has_alc == "y" ),
			hasDelivery:    ( data.has_delivery == "y" ),
			hasPark:        ( data.has_park == "y" ),
			coordinates:    data.coord
		};

		places.push(place);
	});
});

const sql = createConnection({
	host:           "localhost",
	port:           3300,
	user:           "root",
	password:       "password",
	database:       "me_project",
	connectTimeout: 3000,
	timeout:        3000
});

sql.connect(err => {
	if (err) throw err;

	console.log("Dropping table 'places' ...");
	new Promise(( next => {
		sql.query("DROP TABLE places;", err => {
			console.log("Table 'places' dropped.");
			next(null);
		});
	} ))
		.then(() => {
			console.log("Creating table 'places' ...");

			const file = "./create_table_query.txt";
			const queries = readFileSync(file).toString();

			return new Promise(next => {
				sql.query(queries, err => {
					if (err) throw err;
					console.log("Table 'places' created.");
					next(null);
				});
			});
		})
		.then(() => {
			console.log("Inserting values into 'places' ...");
			places.forEach(place => {
				const str = `INSERT INTO places VALUES(
					NULL, "${ place.sector }", "${ place.name }", ${ place.rating },
					"${ place.workingHours }", "${ place.address }", "${ place.specialization }",
					"${ place.phone }", ${ place.hasAlcohol }, ${ place.hasDelivery }, ${ place.hasPark },
					"${ place.coordinates }" );`;

				return new Promise(next => {
					sql.query(str, (err) => {
						if (err) throw err;
						inserted++;

						if (inserted == places.length)
							next(null);
					});
				});
			});
		})
		.then(() => {
			console.log(`All fields ${ places.length } inserted. Closing ...`);
			sql.end();
		});
});


type Sector = "Botanica" | "Ciocana" | "Riscani" | "Centru" | "Telecentru";

interface PlaceRaw {
	sector: string;
	name: string;
	rating: string;
	wrkh: string;
	address: string;
	spec: string;
	phone: string;
	has_alc: string;
	has_delivery: string;
	has_park: string;
	coord: string;
}

interface Place {
	id: null,
	sector: Sector;
	name: string;
	rating: number;
	workingHours: string;
	address: string;
	specialization: string;
	phone: string;
	hasAlcohol: boolean;
	hasDelivery: boolean;
	hasPark: boolean;
	coordinates: string;
}
