'use strict';
const express = require('express'),
  app = express();
exports = module.exports = app;
const _ = require('lodash'),
  HttpError = require('http-error-constructor'),
  cookieParser = require('cookie-parser'),
  core = require('./core'),
  logger = require('morgan'),
  log = require('debug-logger')('app'),
  router = require('./routes');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', express.static('./public'));
app.use('/api', router);
app.use((req, res, next) => next(new HttpError(404)));
app.use((err, req, res, next) => {
  log.error(err);
  res.status(_.get(err, 'statusCode', 500)).json({err});
});

core.AmiiboDatabase
  .load('./amiibo.json')
  .then(() => {
    const {NFC} = require('nfc-pcsc');
    const nfc = new NFC();
    nfc
      .on('reader', reader => {
        core.System.readerAttached(reader);
        reader
          .on('error', log.error)
          .on('end', () => core.System.readerDetached(reader))
          .on('card', card => core.System.cardPresented(reader, card))
          .on('card.off', card => core.System.cardRemoved(reader, card));
      })
      .on('error', log.error);
  })
  .catch(log.error);