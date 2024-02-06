# RabbitStressTest

RabbitStressTest is a Node.js library designed to facilitate stress testing and message publishing within a RabbitMQ instance. It enables users to send messages to various bindings in RabbitMQ with different test scenarios.

## Features

-   **Flexible Testing**: Run various stress tests on RabbitMQ, including round-robin distribution, random distribution, extended-duration tests, and single-binding tests.
-   **Dynamic Configuration**: Easily update RabbitMQ connection details, exchanges, and bindings within the test environment.
-   **Snapshot Functionality**: Capture the state of the testing environment at specific moments, including connection information, exchanges, bindings, total messages sent, test duration, and message success rate.
---
### Installation 
	npm install rabbitmq-stress-test

### Usage
	const RabbitStressTest = require('rabbitmq-stress-test');

	// Define RabbitMQ connection details, exchanges, and bindings
	const rabbitAddress = 'amqp://localhost';
	const exchanges = [{...}, {...}, {...}];
	const bindings = [{...}, {...}, {...}];
	const target = 1000;

	// Create an instance of RabbitStressTest
	const stressTest = new RabbitStressTest(rabbitAddress, exchanges, bindings, target);

	// Prepare the tests before running
	stressTest.prepTests();

	// Run a stress test of your choice
	stressTest.runTest('round-robin');

### API
---
-   **connectToRabbitMQ()**: Establishes a connection to RabbitMQ.
-   **publishMessage(exchangeName, key, msgObj)**: Publishes a message to a specified exchange.
-   **closeConnection()**: Closes the connection to RabbitMQ.
-   **prepTests()**: Prepares the tests by compiling exchanges and bindings and establishing a connection to RabbitMQ.
-   **runTest(type)**: Runs a stress test of the specified type.
-   **takeSnapshot()**: Takes a snapshot of the current testing environment.
-   **updateRabbitStressTest(rabbitAddress, exchanges, bindings)**: Updates RabbitMQ connection details, exchanges, and bindings in the test environment.
-   **updateTarget(target)**: Updates the target number of messages to be sent.

## Notes

-   For extended-duration tests, the duration defaults to one hour. This can be adjusted if needed.
-   Message distribution in "round-robin", "random", and "single-binding" tests continues until the target number of messages is reached.
