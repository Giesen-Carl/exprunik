import express from 'express';
import { auth, Role, validateRole } from './auth_router.js';
import Cocktail from './database/model/cocktailModel.js';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { redirect } from './auth_router.js';

const cocktailRouter = express.Router();
cocktailRouter.use(cookieParser());
cocktailRouter.use(express.urlencoded({ extended: true }));
cocktailRouter.use(bodyParser.json());
cocktailRouter.use(redirect);

cocktailRouter.route('/cocktails')
    .get(auth, validateRole(Role.ADMIN), (req, res) => {
        res.render('createCocktail.ejs');
    })
    .post(auth, validateRole('ADMIN'), async (req, res) => {
        const body = req.body;
        try {
            const existing = await Cocktail.findByPk(body.cocktailIdent);
            if (existing) {
                throw new Error('Es existiert bereits ein Cocktail mit diesem Namen.')
            }
            await Cocktail.create({
                cocktailIdent: body.cocktailIdent,
                category: body.category,
                price: body.price,
                description: body.description,
            });
            res.redirect('/');
        } catch (error) {
            const data = { cocktailIdent: body.cocktailIdent, category: body.category, price: body.price, description: body.description, error: error.message };
            res.render('createCocktail.ejs', data);
        }
    });

cocktailRouter.post('/cocktails/delete/:cocktailIdent', async (req, res) => {
    const paramName = req.params.cocktailIdent;
    try {
        const cocktail = await Cocktail.findOne({ where: { cocktailIdent: paramName } })
        await cocktail.destroy();
    } catch (e) {
        console.log(e);
    }
    res.redirect('/')
});

export default cocktailRouter;