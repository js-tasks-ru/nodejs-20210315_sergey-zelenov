const app = require('../app');
const Product = require('../models/Product');
const Category = require('../models/Category');
const connection = require('../libs/connection');
const expect = require('chai').expect;
const axios = require('axios');

describe('mongodb-mongoose/search', () => {
  let _index = [];
  let _server;
  before(async () => {
    await Category.deleteMany();
    await Product.deleteMany();

    const category = await Category.create({
      title: 'Category1',
      subcategories: [{
        title: 'Subcategory1',
      }],
    });

    await Product.create({
      title: 'ProductA',
      description: 'better than ProductB',
      price: 10,
      category: category.id,
      subcategory: category.subcategories[0].id,
      images: ['image1'],
    });

    await Product.create({
      title: 'ProductB',
      description: 'better than ProductA',
      price: 10,
      category: category.id,
      subcategory: category.subcategories[0].id,
      images: ['image1'],
    });
  
    await Category.syncIndexes();
    await Product.syncIndexes();

    await new Promise((resolve) => {
      _server = app.listen(3000, resolve);
    });
  });

  after(async () => {
    await Category.deleteMany();
    await Product.deleteMany();
    connection.close();
    _server.close();
  });

  describe('модель товара', () => {
    it('у модели есть текстовый индекс с именем TextSearchIndex', () => {
      _index = Product.schema._indexes.find((index) => index[1].name === 'TextSearchIndex');
      expect(_index).to.be.an('array');
    });

    it('индекс должен включать поля title и description', () => {
      expect(_index[0]).to.have.keys('title', 'description');
    });

    it('индекс содержит указание весов для полей', () => {
      expect(_index[1]).to.have.property('weights');
      expect(_index[1].weights).has.keys('title', 'description');
      expect(
          _index[1].weights.title,
          'title имеет вес 10'
      ).to.equal(10);
      expect(
          _index[1].weights.description,
          'description имеет вес 5'
      ).to.equal(5);
    });

    it('язык по умолчанию - русский', () => {
      expect(_index[1].default_language).to.equal('russian');
    });
  });

  describe('/api/products?query=', () => {
    it('товары должны возвращаться в порядке релевантности', async () => {
      const response = await axios.get('http://localhost:3000/api/products', {
        params: {query: 'ProductA'},
      });

      const products = response.data.products;

      expect(
          products,
          '.products является массивом с двумя элементами'
      ).to.be.an('array').that.has.lengthOf(2);

      expect(
          products[0].title,
          'первый элемент в списке с заголовком ProductA'
      ).to.equal('ProductA');

      expect(
          products[1].title,
          'второй элемент в списке с заголовком ProductB'
      ).to.equal('ProductB');
    });

    it('если ничего не найдено - пустой массив', async () => {
      const response = await axios.get('http://localhost:3000/api/products', {
        params: {query: 'testtesttesttest'},
      });

      const products = response.data.products;

      expect(
          products,
          '.products является массивом с двумя элементами'
      ).to.be.an('array').that.has.lengthOf(0);
    });
  });
});
