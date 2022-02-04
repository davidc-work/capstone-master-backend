var express = require('express');
var router = express.Router();
const https = require('https');
const bodyParser = require('body-parser');
const axios = require('axios').default;
const { response } = require('express');
const { Socket } = require('dgram');

var jsonParser = bodyParser.json();

const microservices = {
  auth: 'https://login-microservice-v1.herokuapp.com',
  transactions: 'https://transaction-microservice-v1.herokuapp.com',
  profile: 'https://user-profile-transaction.herokuapp.com',
  mutualFunds: 'https://immense-brushlands-56087.herokuapp.com',
  stocks: 'http://stocks-microservice.herokuapp.com'
}

function authenticate(req, res, next) {
  (async () => {
    if (!req.body.username || !req.body.sessionID) return res.send({error: 'missing fields!'});
 
    let authData, i = 0;
    while (!authData && i < 10) {
      try {
        authData = (await axios.post(microservices.auth + '/auth', {
          username: req.body.username,
          sessionID: req.body.sessionID
        })).data;
      } catch (e) { console.log('error', i) }
      i++;
    }

    console.log(authData);
    
    if (authData) {
      if (!authData.error && !authData.err) {
        req.customerId = authData.customerID;
        return next();
      }
    }
    
    return res.send({error: authData.error || authData.err || 'authentication error'});
  })();
}

router.post('/signup', jsonParser, async (req, res) => {
  console.log(req.body);
  if (!req.body.username || !req.body.password ||
    !req.body.firstName || !req.body.lastName || 
    !req.body.email || !req.body.birthdate) return res.send({error: 'missing fields!'})

  let signupData, i = 0;
  while (!signupData && i < 10) {
    try {
      signupData = (await axios.post(microservices.auth + '/signup', {
        username: req.body.username,
        password: req.body.password
      })).data;
    } catch (e) { console.log('error', i) }
    i++;
  }

  if (!signupData) return res.send({error: 'signup error'});
  if (signupData.error) return res.send(signupData);

  try {
    var transactionData = (await axios.post(microservices.transactions + '/customers/create', {
      id: signupData.id
    })).data;
  } catch (e) { console.log(e) }

  if (!transactionData) return res.send({error: 'transaction error'});
  if (transactionData.error) return res.send(transactionData);

  try {
    var clientData = (await axios.post(microservices.profile + '/customer', {
      customer_id: signupData.id
    })).data;
    var profileData = (await axios.post(microservices.profile + '/profile/' + signupData.id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      birthdate: req.body.birthdate
    })).data;
  } catch (e) { console.log(e) }

  if (!clientData || !profileData) return res.send({error: 'profile error'});

  return res.send(signupData);
});

router.post('/login', async (req, res) => {
  if (!req.body.username || !req.body.password) return res.send({error: 'missing fields!'});

  let loginData, i = 0;
  while (!loginData && i < 10) {
    try {
      loginData = (await axios.post(microservices.auth + '/login', {
        username: req.body.username,
        password: req.body.password
      })).data;
    } catch (e) { console.log('error', i) }
    i++;
  }

  res.send(loginData || {error: 'login error'});
});

router.post('/auth', async (req, res) => {
  if (!req.body.username || !req.body.sessionID) return res.send({error: 'missing fields!'});
 
  let authData, i = 0;
  while (!authData && i < 10) {
    try {
      authData = (await axios.post(microservices.auth + '/auth', {
        username: req.body.username,
        sessionID: req.body.sessionID
      })).data;
    } catch (e) { console.log('error', i) }
    i++;
  }

  res.send(authData || {error: 'authentication error'});
});

router.post('/purchase-fund', authenticate, jsonParser, (req, res) => {
  if (!(req.body.fund_id && req.body.quantity && req.body.customerId)) return res.send('Missing fields!');
  if (req.body.customerId != req.customerId) return res.send({error: 'user mismatch'});

  (async () => {
    // get fund
    try {
      var fund = (await axios.get(microservices.mutualFunds + '/funds/' + req.body.fund_id)).data;
      fund.price = +fund.price.slice(1);
      console.log('get fund success');
    } catch (e) { return res.send(e); }
    
    // transaction
    try {
      var transaction = (await axios.post(microservices.transactions + '/transactions/create', {
        type: 'purchase',
        itemDescription: fund.name,
        quantity: req.body.quantity,
        pricePerUnit: fund.price,
        fund_id: fund.id,
        CustomerId: req.body.customerId
      })).data;
      console.log('make transaction success');
    } catch (e) { return res.send(e); }

    if (transaction.error) return res.send(transaction.error);

    console.log('attempting portfolio addition');
    try {
      var portfolio = (await axios.post(microservices.profile + '/portfolio', {
        customer_id: req.body.customerId,
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
router.get("/mutual-funds", async (req,res) => {
  console.log(req.body);
  console.log('customerId = ' + req.customerId);
  //staging api call
  let funds = await axios.get(microservices.mutualFunds + "/funds").then(({ data }) => data).catch(err => err);
  let stocks = await axios.get(microservices.stocks + "/stocks").then(({ data }) => data).catch(err => err);
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
  let fund = await axios.get(microservices.mutualFunds + "/funds/" + req.params.id).then(({ data }) => data).catch(err => err);
  let stocks = await axios.get(microservices.stocks + "/stocks").then(({ data }) => data).catch(err => err);
  
  let stocksToSend = [];
  stocks.forEach(stock => {
    if(stock.mutualFundIds !== ""){
      stock.mutualFundIds = stock.mutualFundIds.toString().split(",");
      stock.mutualFundIds.includes(fund.id.toString()) ? stocksToSend.push(stock) : null;
    }
  })
  fund.stocks = stocksToSend;

  res.json(fund);
});

//GET all stocks for stocks page
router.get("/stocks", async (req,res) => {
  console.log(req.body);
  //staging api call
  let stocks = await axios.get(microservices.stocks + "/stocks").then(({ data }) => data).catch(err => err);
  //Return data or response to frontend  
  res.json(stocks);
});

//GET specific stock for stock page
router.get("/stocks/:id", async (req,res) => {
  console.log(req.body);
  //staging api call
  let stocks = await axios.get(microservices.stocks + "/stocks/"+req.params.id).then(({ data }) => data).catch(err => err);
  //Return data or response to frontend  
  res.json(stocks);
});

//GET specific user profile with: transactions & portfolio
router.post("/users/:id", authenticate, async (req,res) => {
  console.log(req.customerId);
  console.log(req.params.id);
  if (req.customerId != req.params.id) return res.send({error: 'user mismatch'});

  //staging api call
  let profile = await axios.get(microservices.profile + `/customer/${req.params.id}`).then(({ data }) => data).catch(err => err);
  profile.transactions = await axios.get(microservices.transactions + `/customers/${req.params.id}`).then(({ data }) => data).catch(err => err);
  let funds = await axios.get(microservices.mutualFunds + "/funds/").then(({ data }) => data).catch(err => err);
  // profile.funds = funds.filter(f => ids.includes(f.id));
  console.log(profile);
  if (!profile || !profile.ClientPortfolios) return res.send({error: 'profile error'});
  profile.ClientPortfolios.forEach(portfolio => {
    portfolio.fundData = funds.find(f => portfolio.fundKey === f.id)
  })
  
  profile.username = req.body.username;
  res.json(profile);
  //Return data or response to frontend
});

//GET filtered transactions based on fund id
router.post("/users/:userId/fund/:fundId", authenticate, async (req, res) => {
  let customer = await axios.get(microservices.transactions + `/customers/${req.params.userId}`).then(({ data }) => data).catch(err => err);
  if(!customer){
    res.json({error: "No user found."});
  } else {
    res.json(customer.Transactions.filter(transaction => transaction.fund_id === +req.params.fundId))
  }
})

//POST a deposit transaction where:
// req.body = {
//   type: "deposit" (Must be lowercase string),
//   amount: Integer,
//   CustomerId, Integer
// }
router.post("/transactions/deposit", authenticate, async (req,res) => {
  console.log(req.body);
  //staging api call
  let temp = await axios.post(microservices.transactions + "/transactions/create", req.body).then(({ data }) => data).catch(err => err);
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
router.post("/transactions/sell", authenticate, async (req,res) => {
  console.log(req.body);
  //staging api call
  let fund = await axios.get(microservices.mutualFunds + "/funds/"+req.body.mutualFundId).then(({ data }) => data).catch(err => err);
  req.body.itemDescription = fund.name;
  req.body.mutualFundId = fund.id;
  req.body.pricePerUnit = fund.price;
  console.log(req.body);
  let profile = await axios.delete(`https://user-profile-transaction.herokuapp.com/portfolio/${req.body.CustomerId}/${req.body.fundKey}/${req.body.quantity}`)
  if(!profile) {
    return res.json({error: "something broke"})
  }
  let transactionLogs = []
  for(let i = 0; i < req.body.id.length; i++){
    let temp = await axios.post(microservices.transactions + "/transactions/sell", {
      type: "sell",
      id: id[i],
      quantity: req.body.quantityArr[i],
      CustomerId: req.body.customer_id
    }).then(({ data }) => data).catch(err => err);
    transactionLogs.push(temp);
  }
  console.log(transactionLogs)
  //Return data or response to frontend  
  res.json(transactionLogs)
});
module.exports = router;

//PUT on a user profile
router.put("/user/:id", authenticate, async (req, res) => {
  let keys = Object.keys(req.body);
  let keyBank = ["firstName", "lastName", "email", "birthdate" , "age"];
  //Deletes any unecessary req.body keys
  for (let key of keys){
    if(!keyBank.includes(key)){
      delete req.body[key]
    }
  }
  res.json(await axios.put(microservices.profile + "/profile/"+ req.params.id, req.body).then(({ data }) => data).catch(err => err));
})