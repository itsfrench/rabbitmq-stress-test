/* 
This test will act as a publisher within your RabbitMQ instance. After instantiated, you will be able to send messages to all queues round-robin.

This class has the following methods: connectToRabbit, publishMessage, closeConnection, prepTests, runTest, takeSnapShot, updateRoundRobinRabbit, and updateTarget.

This test will send messages to each binding provided in sequential order.

To create a new instance of the RoundRobinRabbit class, you will need to provide the following: rabbitAddress, exchanges, bindings, and a target for how many messages you want to send.

  * "rabbitAddress" is URL in which the test can connect to the user's RabbitMQ's instance.
  * "exchanges" is an array containing objects with information on the exchanges
  * "bindings" is an array containing objects with the information on all of the bindings
  * "target" is the number of messages you want to send throughout your instance. 50k messages take about 1 second, and 100k messages take about 2 seconds. If a target is not provided, it will default to 1000.

examples: 
  rabbitAddress = 'amqp://localhost'
  exchanges = [{ 
      name: 'trekker_topic',
      vhost: '/',
      type: 'topic',
      durable: true,
      auto_delete: false,
      internal: false,
      arguments: {}
    }, {...}, {...}]
  bindings = [{
      source: 'trekker_topic',
      vhost: '/',
      destination: 'AuthQueue',
      destination_type: 'queue',
      routing_key: 'Auth',
      arguments: {}
    }, {...}, {...}]
*/ 

const amqp = require('amqplib');

class RoundRobinRabbit {
  constructor(rabbitAddress, exchanges, bindings, target) {
    this.rabbitAddress = rabbitAddress;
    this.exchanges = {};
    this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    this.snapShots = [];
    this.message = {
      type: 'Round Robin',
    };
    exchanges.forEach((exc) => {
      this.exchanges[exc.name] = exc;
    });
    this.target = (target) ? target : 1000;
  }

  //this method makes the connetion to rabbit
  async connectToRabbitMQ() {
    try {
      this.connection = await amqp.connect(this.rabbitAddress);
      this.channel = await this.connection.createChannel();
      console.log('Connected to amqp');
    } catch (error) {
      console.error('Error establishing connection:', error);
      throw error;
    }
  }

  //publishes a message to the exchange
  async publishMessage(exchangeName, key, msgObj) {
    //exchangeType will need to be added back if you need to assert the exchange in the future
    try {
      //await this.channel.assertExchange(exchangeName, exchangeType, { durable: true });
      this.channel.publish(
        exchangeName,
        key,
        Buffer.from(JSON.stringify(msgObj))
      );
      this.totalMessagesSent++;
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  //closes the connection to rabbit
  async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing connection:', error);
      throw error;
    }
  }

  //This method needs to be invoked before using the runTest method to compile all of the exchanges and bindings in a format to be easily sent to the publisher. It will also connect to RabbitMQ.
  prepTests() {
    this.connectToRabbitMQ();
    this.bindings.forEach((binding) => {
      this.testMessages.push({
        exchangeName: binding.source,
        exchangeType: this.exchanges[binding.source].type,
        rabbitAddress: this.rabbitAddress,
        key: binding.routing_key,
        message: this.message,
      });
    });
    this.readyToTest = true;
  }

  //method to begin testing
  async runTest() {
    if (this.readyToTest === false) return;
    try {
      if (!this.connection || !this.channel) {
        await this.connectToRabbitMQ();
        console.log('Starting the round robin test.');
      }
      this.start = new Date(Date.now());
      while (this.totalMessagesSent <= this.target) {
        this.testMessages.forEach(async (msg) => {
          await this.publishMessage(msg.exchangeName, msg.key, msg.message); //msg.exchangeType
        });
      }
      this.takeSnapShot(this.start);
      this.closeConnection();
      console.log(this.snapShots);
    } catch (error) {
      console.error('Error running tests:', error);
    }
  }

  //this will take a snapshot of the current testing environment
  takeSnapShot(startDate) {
    console.log('Taking a snapshot.');
    this.snapShots.push({
      rabbitAddress: this.rabbitAddress,
      exchanges: this.exchanges,
      bindings: this.bindings,
      testMessages: this.testMessages,
      totalMessagesSent: this.totalMessagesSent,
      target: this.target,
      start: startDate,
      end: new Date(Date.now()),
      testDuration: (Date.now() - startDate) / 1000,
      messageSuccessRate: Math.floor(
        (this.totalMessagesSent / this.target) * 100
      ),
    });
  }

  //this method will allow you to completely update your Round Robin test environment
  updateRoundRobinRabbit(rabbitAddress, exchanges, bindings) {
    this.rabbitAddress = rabbitAddress;
    this.exchanges = {};
    this.bindings = bindings;
    this.readyToTest = false;
    this.testMessages = [];
    this.totalMessagesSent = 0;
    this.message = {
      type: 'Round Robin',
    };
    exchanges.forEach((exc) => {
      this.exchanges[exc.name] = exc;
    });
  }
  updateTarget(target) {
    if (target && typeof target === 'number') this.target = target;
  }
}

module.exports = RoundRobinRabbit;
