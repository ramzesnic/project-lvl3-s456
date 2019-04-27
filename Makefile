install:
	npm install
start:
	npx babel-node -- src/bin/page-loader.js
publish:
	npm publish
lint:
	npx eslint .
test:
	DEBUG='page-loader' npm run test -- --watchAll
