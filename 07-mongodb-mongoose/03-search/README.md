# Поиск товаров (решение)

Первым делом составим правильный конфиг для индекса внутри нашей модели. Для создания текстового
индекса мы должны в файле `models/Product.js` вызвать метод `.index()` у схемы, передав список 
полей, по которым необходимо построить индекс. В нашем случае это поля title и description:
```js
productSchema.index(
  { title: 'text', description: 'text' },
);
```

Однако это еще не всё: дело в том, что поведение по умолчанию этого индекса нам не очень подходит,
мы хотим иметь возможность контролировать поведение наших поисковых запросов, в частности поле
`title` должно иметь бо́льший вес, нежели поле `description`. Для этого мы должны вторым аргументом 
передать объект с настройками, который будет содержать следующие поля:
- `weights` веса полей (10 для заголовка, 5 для описания товара)
- `default_language` язык по умолчанию, который надо использовать для разбора текста
- `name` этот ключ не является обязательным, но мы укажем его для того, чтобы указать какое имя 
использовать для индекса. 
Получившийся код будет выглядеть следующим образом:
```js
productSchema.index(
  { title: 'text', description: 'text' },
  {
    weights: { title: 10, description: 5 },
    default_language: 'russian',
    name: 'TextSearchIndex'
  }
);
```

Теперь необходимо создать функцию, которая будет принимать запрос пользователя, выполнять запрос к 
базе и преобразовывать результаты поиска для того, что вернуть их в ответе. 
Первым делом нам необходимо убедиться в том, что запрос содержит поле `query`, ведь без него мы не
сможем выполнить запрос к базе данных.
```js
module.exports.productsByQuery = async function productsByQuery(ctx, next) {
  const {query} = ctx.query;
  if (!query) return next();
};
```

Далее составим поисковый запрос к MongoDB:
```js
const Product = require('../models/Product');

module.exports.productsByQuery = async function productsByQuery(ctx, next) {
  const {query} = ctx.query;
  if (!query) return next();
  
  const products = await Product
    .find({$text: { $search: query }}, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
};
```
Обратите внимание, помимо собственно строки запроса, которая передаётся через специальный оператор
`$text`, мы также обязательно должны указать правильную сортировку - она должна осуществляться по 
служебному полю `textScore`, которое не хранится в самом документе, а пересчитывается каждый раз для
конкретного запроса. Подробнее об этом вы можете почитать в 
[разделе документации](https://docs.mongodb.com/manual/core/index-text/#index-feature-text) MongoDB, 
посвященном работе с текстовыми индексами.  

Ну и наконец нам осталось вернуть товары пользователю. Как и в предыдущих заданиях я рекоммендую
выносить эту функциональность в отдельные функции, поскольку с ростом проекта они могут значительно
изменяться и усложняться. Код преобразований в нашем случае выглядит подобным образом:
```js
module.exports = function mapProduct(product) {
  return {
    id: product.id,
    title: product.title,
    images: product.images,
    category: product.category,
    subcategory: product.subcategory,
    price: product.price,
    description: product.description,
  };
};
```  

Собирая всё вместе мы получим итоговое решение:
```js
const Product = require('../models/Product');
const mapProducts = require('../mappers/product');

module.exports.productsByQuery = async function productsByQuery(ctx, next) {
  const {query} = ctx.query;
  if (!query) return next();
  
  const products = await Product
    .find({$text: { $search: query }}, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
  ctx.body = { products: products.map(mapProducts) };
};
```

