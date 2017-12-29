'use strict';

require('dotenv').config();

const port = process.env.PORT || 8080;
const env = process.env.ENV || 'development';
const express = require('express');
const bodyParser = require('body-parser');
const sass = require('node-sass-middleware');
const app = express();
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[env]);
const morgan = require('morgan');
const knexLogger = require('knex-logger');
const cookieSession = require('cookie-session');
const owjs = require('overwatch-js');
const bcrypt = require('bcrypt');
const _ = require('lodash')

// // Seperated Routes for each Resource
const usersRoutes = require('./routes/users');
const enrollmentsRoutes = require('./routes/enrollments');
const tournamentsRoutes = require('./routes/tournaments');
// const gamesRoutes = require('./routes/games');
// const teamsRoutes = require('./routes/teams');

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000
}));

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Mount all resource routes
app.use('/users', usersRoutes(knex, bcrypt));
app.use('/enrollments', enrollmentsRoutes(knex, owjs));
app.use('/tournaments', tournamentsRoutes(knex, _, env));
// app.use('/games', gamesRoutes(knex));
// app.use('/teams', teamsRoutes(knex));

function playersEnrolled(tournamentID){
  return knex
    .select("users.battlenet_id", "level", "games_won", "medal_gold", "medal_silver", "medal_bronze")
    .from("enrollments")
    .innerJoin("users", "users.id", "enrollments.user_id")
    .where({tournament_id: tournamentID})
    .then((result) => {
      return result
    });
}

function asOwnerListing(email) {
  const asOwnerList = [];
  knex
    .select("tournaments.id", "name", "is_started",)
    .from("tournaments")
    .innerJoin("users", "users.id", "tournaments.creator_user_id")
    .where({email: email})
    .then( async (asOwner) => {
      if(asOwner.length !== 0) {
        for (let t = 0; t < asOwner.length; t++) {
          // this won't work with fake data...will have to fake a lot of data
          // const enrolledPlayers = await playersEnrolled(asOwner[t].tournament_id);
          const enrolledPlayers = 12;
          asOwner[t].enrolledPlayers = enrolledPlayers.length;
          asOwnerList.push(asOwner[t]);
        }
      }
      console.log(asOwnerList)
      return asOwnerList
    });
}

async function asPlayerListing(email) {
  const asPlayerList = [];
  await knex
    .select("tournament_id", "tournaments.name", "tournaments.is_started")
    .from("enrollments")
    .innerJoin("tournaments", "tournaments.id", "enrollments.tournament_id")
    .innerJoin("users", "users.id", "enrollments.user_id")
    .where({email: email})
    .then( async (asPlayer) => {
        for (let t = 0; t < asPlayer.length; t++) {
          // this won't work with fake data...will have to fake a lot of data
          // const enrolledPlayers = await playersEnrolled(asPlayer[t].tournament_id);
          const enrolledPlayers = 15;
          asPlayer[t].enrolledPlayers = enrolledPlayers.length;
          asPlayerList.push(asPlayer[t]);
        }
        return asPlayerList
      })   
}

// Home page, passes along whis logged in as the 'login' variable
app.get('/', (req, res) => {
  const email = req.session.email

  if(!email){
    res.render('index', {email: email})
  } else {
    const asPlayerList = [];
  const asOwnerList = [];
  knex
    .select("tournament_id", "tournaments.name", "tournaments.is_started")
    .from("enrollments")
    .innerJoin("tournaments", "tournaments.id", "enrollments.tournament_id")
    .innerJoin("users", "users.id", "enrollments.user_id")
    .where({email: email})
    .then( async (asPlayer) => {
        for (let t = 0; t < asPlayer.length; t++) {
          // this won't work with fake data...will have to fake a lot of data
          // const enrolledPlayers = await playersEnrolled(asPlayer[t].tournament_id);
          const enrolledPlayers = 12;
          asPlayer[t].enrolledPlayers = enrolledPlayers.length;
          asPlayerList.push(asPlayer[t]);
        }

        knex
          .select("tournaments.id", "name", "is_started",)
          .from("tournaments")
          .innerJoin("users", "users.id", "tournaments.creator_user_id")
          .where({email: email})
          .then( async (asOwner) => {
            for (let t = 0; t < asOwner.length; t++) {
              // this won't work with fake data...will have to fake a lot of data
              // const enrolledPlayers = await playersEnrolled(asPlayer[t].tournament_id);
              const enrolledPlayers = 15;
              asOwner[t].enrolledPlayers = enrolledPlayers.length;
              asOwnerList.push(asOwner[t]);
            }
            res.render('index', {
              email: req.session.email, 
              asPlayerList: asPlayerList, 
              asOwnerList: asOwnerList
            });
          }); 
        })
  }  
});

app.get("/faq", (req, res) => {

  res.render("faq", {email: req.session.email})
});

app.get('/json', (req, res) => {
  res.json(['Joel', 'Mel']);
})

app.use(express.static(__dirname + '/public'));

app.listen(port, () => {
  console.log('Example app listening on port ' + port);
});
