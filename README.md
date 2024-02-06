
### NPM Package Documentation
----------

#### rabbitmq-stress-test

**Description:**

This npm package offers RandomRabbit and RoundRobinRabbit, designed for facilitating message publishing within a RabbitMQ instance, specifically tailored for topic-type exchanges. This package offers distinct methods for distributing messages across multiple queues efficiently.

**Features:**

-   **Topic-Type Exchanges:** Both packages are designed to work seamlessly with topic-type exchanges in RabbitMQ.
-   **Random Message Distribution (RandomRabbit):** RandomRabbit facilitates message distribution by randomly selecting exchanges from the provided list of bindings, ideal for scenarios requiring random message dissemination.
-   **Round-Robin Message Distribution (RoundRobinRabbit):** RoundRobinRabbit sends messages to exchanges in a sequential, round-robin fashion, ensuring even distribution across all provided bindings.
- **Snapshot Functionality:**
Both RandomRabbit and RoundRobinRabbit classes provide snapshot functionality to capture the state of the testing environment at a particular moment. Snapshots include details such as RabbitMQ connection information, exchanges, bindings, total messages sent, test duration, and message success rate.


**Example Configuration:**

	const rabbitAddress = 'amqp://localhost';
	const exchanges = [{...}, {...}, {...}];
	const bindings = [{...}, {...}, {...}];
	const target = 1000;

	// Instantiate RandomRabbit
	const randomRabbit = new RandomRabbit(rabbitAddress, exchanges, bindings, target);

	// Instantiate RoundRobinRabbit
	const roundRobinRabbit = new RoundRobinRabbit(rabbitAddress, exchanges, bindings, target);

	// Prepare tests
	randomRabbit.prepTests();
	roundRobinRabbit.prepTests();

	// Run tests
	randomRabbit.runTest();
	roundRobinRabbit.runTest();

