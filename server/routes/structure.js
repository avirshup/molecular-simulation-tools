const Busboy = require('busboy');
const Promise = require('bluebird');
const axios = require('axios');
const express = require('express');
const fs = Promise.promisifyAll(require('fs'));
const ioUtils = require('../utils/io_utils');
const workflowUtils = require('../utils/workflow_utils');
const appConstants = require('../constants/app_constants');
const shortid = require('shortid');

const router = new express.Router();

const RCSB_URL = 'https://files.rcsb.org/download';

/**
 * First step in workflow1: selecting a ligand.
 * Test with: curl -F file=@`pwd`/server/test/1bna.pdb localhost:4000/v1/structure/executeWorkflow1Step0
 * @param  {[type]}   '/executeWorkflow1Step0' [description]
 * @param  {Function} (req,                    res,          next)         [description]
 * @param  {[type]}   'utf8').then((err,       inputPdb      [description]
 * @return {[type]}                            {"prepJson": "URL", "prepPdb": "URL"}
 */
router.post('/executeWorkflow1Step0', (req, res, next) => {
  const busboy = new Busboy({
    headers: req.headers,
  });

  const tmpFileName = `/tmp/_temp_executeWorkflow1Step0_${shortid.generate()}`;
  const cleanup = () => {
    try {
      fs.deleteFileSync(tmpFileName);
    } catch(err) {log.error(err);}
  }

  const handleError = (err) => {
    cleanup();
    log.error(JSON.stringify(err));
    next(err);
  }

  busboy.on('error', handleError);
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const writeStream = fs.createWriteStream(tmpFileName);
    writeStream.on('finish', () => {
      workflowUtils.executeWorkflow1Step0(fs.createReadStream(tmpFileName))
        .then(jobResult => {
          if (!jobResult.success) {
            const error = new Error('Failed to execute processing');
            error.result = jobResult;
            return handleError(error);
          }
          cleanup();
          res.send(jobResult);
        })
        .catch(handleError);
    });
    writeStream.on('error', handleError);
    file.pipe(writeStream);
    file.on('error', handleError);
  });
  return req.pipe(busboy);
});

module.exports = router;
