var express = require('express');
var router = express.Router();
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios').default;

var jsonParser = bodyParser.json();

/* GET home page. */
/*router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});*/

router.post('/purchase-fund', jsonParser, (req, res) => {
  if (!(req.body.fund_id && req.body.quantity && req.body.customerId)) return res.send('Missing fields!');
  (async () => {
    // get fund
    try {
      var fund = (await axios.get('https://immense-brushlands-56087.herokuapp.com/funds/' + req.body.fund_id)).data;
      fund.price = +fund.price.slice(1);
    } catch (e) { return res.send(e); }
    
    // transaction
    try {
      var transaction = (await axios.post('https://transaction-microservice-v1.herokuapp.com/transactions/create', {
        type: 'purchase',
        itemDescription: fund.name,
        quantity: req.body.quantity,
        pricePerUnit: fund.price,
        CustomerId: req.body.customerId
      })).data;
    } catch (e) { return res.send(e); }

    if (transaction.error) return res.send(transaction.error);

    try {
      var portfolio = (await axios.post('https://user-profile-transaction.herokuapp.com/portfolio', {
        CustomerId: req.body.customerId,
        fundKey: fund.id
      })).data;
    } catch (e) { return res.send(e); }

    if (portfolio.error) return res.send(portfolio.error);
    
    res.send({
      fund,
      transaction,
      portfolio
    });
  })();
});

module.exports = router;
