import 'dotenv/config';
import Cocktail from "../src/database/model/cocktailModel.js";
import fs from 'node:fs';

try {
    const messages = [];
    const data = JSON.parse(fs.readFileSync('scripts/data/cocktails.json', 'utf8'));
    for (const [category, items] of Object.entries(data)) {
        for (const item of items) {
            try {
                await Cocktail.create({
                    cocktailIdent: item.name,
                    category: category,
                    price: item.price,
                    description: item.description
                });
                messages.push(`[+++] Cocktail ${item.name} was created successfully`);
            } catch (err) {
                messages.push(`[XXX] Cocktail ${item.name} could not be created`)
            }
        }
    }
    for (const message of messages) {
        console.log(message);
    }
} catch (err) {
    console.log(err)
}