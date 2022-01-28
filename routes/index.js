var express = require('express');
var router = express.Router();
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios').default;
const { response } = require('express');
const { Socket } = require('dgram');

var jsonParser = bodyParser.json();

/* GET home page. */
/*router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});*/

router.post('/create-user', jsonParser, (req, res) => {

});

router.post('/purchase-fund', jsonParser, (req, res) => {
  if (!(req.body.fund_id && req.body.quantity && req.body.customerId)) return res.send('Missing fields!');
  (async () => {
    // get fund
    try {
      var fund = (await axios.get('https://immense-brushlands-56087.herokuapp.com/funds/' + req.body.fund_id)).data;
      fund.price = +fund.price.slice(1);
      console.log('get fund success');
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
      console.log('make transaction success');
    } catch (e) { return res.send(e); }

    if (transaction.error) return res.send(transaction.error);

    try {
      var portfolio = (await axios.post('https://user-profile-transaction.herokuapp.com/portfolio', {
        CustomerId: req.body.customerId,
        fundKey: fund.id,
        quantity: req.body.quantity
      })).data;
      console.log('add to portfolio success');
    } catch (e) { return res.send(e); }

    if (portfolio.error) return res.send(portfolio.error);
    
    res.send({
      fund,
      transaction,
      portfolio
    });
  })();
});

//GET all mutual funds with: associated stocks for mutual funds page where:
// params = {
//   id: Mutual Fund Id
// }
// Works //
router.get("/mutual-funds", async (req,res) => {
  console.log(req.body);
  //staging api call
  let funds = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds").then(({ data }) => data).catch(err => err);
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  // console.log(stocks);
  funds.forEach(fund => {
    //find and match each stocks that corresponds to each mutual fund
    let stocksToSend = [];
    stocks.forEach(stock => {
      if(stock.mutualFundIds !== ""){
        stock.mutualFundIds = stock.mutualFundIds.toString().split(",");
        console.log(stock.mutualFundIds);
        stock.mutualFundIds.includes(fund.id.toString()) ? stocksToSend.push(stock) : null;
      }
    })
    fund.stocks = stocksToSend;
  })
  //Return data or response to frontend  
  res.json(funds);
});

router.get("/mutual-funds/:id", async (req,res) => {
  console.log(req.body);
  //staging api call
  let fund = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds/" + req.params.id).then(({ data }) => data).catch(err => err);
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  
  //find and match each stocks that corresponds to each mutual fund
  let stocksToSend = [];
  stocks.forEach(stock => {
    if(stock.mutualFundIds !== ""){
      stock.mutualFundIds = stock.mutualFundIds.toString().split(",");
      console.log(stock.mutualFundIds);
      stock.mutualFundIds.includes(fund.id.toString()) ? stocksToSend.push(stock) : null;
    }
  })
  fund.stocks = stocksToSend;
  //Return data or response to frontend  
  res.json(fund);
});

//GET all stocks for stock page
// Works //
router.get("/stocks", async (req,res) => {
  console.log(req.body);
  //staging api call
  let stocks = await axios.get("http://stocks-microservice.herokuapp.com/stocks").then(({ data }) => data).catch(err => err);
  //Return data or response to frontend  
  res.json(stocks);
});

//GET specific user profile with: transactions & portfolio
// Works //
router.get("/users/:id", async (req,res) => {
  console.log(req.body);
  //staging api call
  let profile = await axios.get(`http://user-profile-transaction.herokuapp.com/customer/${req.params.id}`).then(({ data }) => data).catch(err => err);
  profile.transactions = await axios.get(`https://transaction-microservice-v1.herokuapp.com/customers/${req.params.id}`).then(({ data }) => data).catch(err => err);
  //Return data or response to frontend
  res.json(profile);
});

//POST a deposit transaction where:
// req.body = {
//   type: "deposit" (Must be lowercase string),
//   amount: Integer,
//   CustomerId, Integer
// }
// Works //
router.post("/transactions/deposit", async (req,res) => {
  console.log(req.body);
  //staging api call
  let temp = await axios.post("https://transaction-microservice-v1.herokuapp.com/transactions/create", req.body).then(({ data }) => data).catch(err => err);
  console.log(temp)
  //Return data or response to frontend  
  res.send(temp)
});

//POST a sell transaction where:
// req.body = {
//   type: "sell" (Must be lowercase string),
//   id: Integer (Transaction id),
//   quantity: Integer (Quantity to sell will fail if greater than available or if 0),
//   CustomerId: Integer
// }
// Works //
router.post("/transactions/sell", async (req,res) => {
  console.log(req.body);
  //staging api call
  let fund = await axios.get("https://immense-brushlands-56087.herokuapp.com/funds/"+req.body.mutualFundId).then(({ data }) => data).catch(err => err);
  req.body.itemDescription = fund.name;
  req.body.mutualFundId = fund.id;
  req.body.pricePerUnit = fund.price;
  console.log(req.body);
  let temp = await axios.post("https://transaction-microservice-v1.herokuapp.com/transactions/sell", req.body).then(({ data }) => data).catch(err => err);
  console.log(temp)
  //Return data or response to frontend  
  res.json(temp)
});
module.exports = router;
