import spinUp from "./spinUp";
import { ObjectId } from "mongodb";

let db, schema, queryAndMatchArray, runMutation, close;
let adam, katie, laura, mallory, book1, book2, book3;

beforeEach(async () => {
  ({ db, schema, queryAndMatchArray, runMutation, close, close } = await spinUp());

  adam = { name: "Adam", birthday: new Date("1982-03-22") };
  katie = { name: "Katie", birthday: new Date("2009-08-05") };
  laura = { name: "Laura", birthday: new Date("1974-12-19") };
  mallory = { name: "Mallory", birthday: new Date("1956-08-02") };

  await Promise.all([adam, katie, laura, mallory].map(person => db.collection("authors").insertOne(person)));

  book1 = { title: "Book 1", pages: 100, authorNames: ["" + adam.name], mainAuthorName: "" + adam.name };
  book2 = { title: "Book 2", pages: 150, authorNames: ["" + adam.name] };
  book3 = { title: "Book 3", pages: 200, authorNames: ["" + katie.name] };

  await db.collection("books").insertOne(book1);
  await db.collection("books").insertOne(book2);
  await db.collection("books").insertOne(book3);

  await db.collection("authors").updateOne({ _id: ObjectId(adam._id) }, { $set: { firstBookId: "" + book2._id } });
});

afterEach(async () => {
  await db.collection("books").deleteMany({});
  await db.collection("authors").deleteMany({});
  close();
  db = null;
});

//---------------------------Create-----------------------------------------------------------

test("Create - Basic add single new author with hook", async () => {
  await runMutation({
    mutation: `createBook(Book: {title: "XYZ" authorsByName: [{name: "A"}, {name: "BUMP"}, { name: "ABORT" }]}){Book{title}}`,
    result: "createBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "XYZ"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "XYZ", authorsByName: [{ name: "A" }, { name: "BUMPab" }] }]
  });
});

test("Create - Basic add single new author with abort hook", async () => {
  await runMutation({
    mutation: `createBook(Book: {title: "XYZ", authorsByName: [{name: "A"}, { name: "BUMP" }, { name: "ABORT" }]}){Book{title}}`,
    result: "createBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "XYZ"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "XYZ", authorsByName: [{ name: "A" }, { name: "BUMPab" }] }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

test("Create - Basic set mainAuthorByName", async () => {
  await runMutation({
    mutation: `createBook(Book: {title: "XYZ", mainAuthorByName: { name: "A" }}){Book{title}}`,
    result: "createBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "XYZ"){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "XYZ", mainAuthorByName: { name: "A" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

// --------------------------------- Update Single --------------------------------------------

test("UpdateSingle - mainauthor by name", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {mainAuthorByName_SET: { name: "New Author" }}){Book{title authorsByName{name}}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "New Author" } }]
  });
});

test("UpdateSingle - Basic add single new author", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {authorsByName_ADD: { name: "New Author" }}){Book{title authorsByName{name}}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "New Author" }] }]
  });
});

test("UpdateSingle - Basic add single new author, and single existing author", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {authorsByName_ADD: { name: "New Author" }, authorNames_ADDTOSET: "${
      katie.name
    }"}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author" }] }]
  });
});

test("UpdateSingle - Basic add 2 new authors, and single existing author", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${
      book1._id
    }", Updates: {authorsByName_ADD: [{ name: "New Author1" }, { name: "New Author2" }], authorNames_ADDTOSET: "${katie.name}"}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author1" }, { name: "New Author2" }] }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "New Author", SORT: {name: 1}){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author1" }, { name: "New Author2" }]
  });
});

//--------------------------- Update Multi -----------------------------------------------------

test("UpdateMulti - Basic add mainAuthorByName", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}", "${
      book3._id
    }"], Updates: {mainAuthorByName_SET: { name: "New Author" }}){Books{title authorsByName{name}}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "New Author" } }, { title: "Book 3", mainAuthorByName: { name: "New Author" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateMulti - Basic add single new author", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}", "${
      book3._id
    }"], Updates: {authorsByName_ADD: { name: "New Author" }}){Books{title authorsByName{name}}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "New Author" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateMulti - Basic add single new author, and single existing author", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}", "${book3._id}"], Updates: {authorsByName_ADD: { name: "New Author" }, authorNames_ADDTOSET: "${
      katie.name
    }"}){Books{title}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateMultiple - Basic add 2 new authors, and single existing author", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}", "${
      book3._id
    }"], Updates: {authorsByName_ADD: [{ name: "New Author1" }, { name: "New Author2" }], authorNames_ADDTOSET: "${katie.name}"}){Books{title}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"]){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author1" }, { name: "New Author2" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author1" }, { name: "New Author2" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "New Author", SORT: {name: 1}){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author1" }, { name: "New Author2" }] //just created once
  });
});

//--------------------------- Update Bulk -----------------------------------------------------

test("UpdateBulk - Basic add single new author", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}", "${
      book3._id
    }"] }, Updates: {mainAuthorByName_SET: { name: "New Author" }}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "New Author" } }, { title: "Book 3", mainAuthorByName: { name: "New Author" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateBulk - Basic add single new author", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}", "${book3._id}"] }, Updates: {authorsByName_ADD: { name: "New Author" }}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "New Author" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateBulk - Basic add single new author, and single existing author", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}", "${
      book3._id
    }"] }, Updates: {authorsByName_ADD: { name: "New Author" }, authorNames_ADDTOSET: "${katie.name}"}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"], SORT: {title: 1}){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name: "New Author"){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author" }] //just one
  });
});

test("UpdateBulk - Basic add 2 new authors, and single existing author", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: {_id_in: ["${book1._id}", "${
      book3._id
    }"]}, Updates: {authorsByName_ADD: [{ name: "New Author1" }, { name: "New Author2" }], authorNames_ADDTOSET: "${katie.name}"}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(_id_in: ["${book1._id}", "${book3._id}"]){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [
      { title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "Katie" }, { name: "New Author1" }, { name: "New Author2" }] },
      { title: "Book 3", authorsByName: [{ name: "Katie" }, { name: "New Author1" }, { name: "New Author2" }] }
    ]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "New Author", SORT: {name: 1}){Authors{name}}}`,
    coll: "allAuthors",
    results: [{ name: "New Author1" }, { name: "New Author2" }] //just created once
  });
});

//---------------------------Update Single-----------------------------------------------------------

test("UpdateSingle - Basic add single new author with hook", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {authorsByName_ADD: { name: "BUMP" }}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });
});

test("UpdateSingle - Basic add single new author with abort hook", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {authorsByName_ADD: [{ name: "BUMP" }, { name: "ABORT" }]}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

test("UpdateSingle - Basic set mainAuthorByName abort hook", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {mainAuthor_SET: { name: "ABORT" }}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "Adam" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

//---------------------------Update Multi-----------------------------------------------------------

test("UpdateMulti - Basic add single new author with hook", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}"], Updates: {authorsByName_ADD: { name: "BUMP" }}){Books{title}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });
});

test("UpdateMulti - Basic add single new author with abort hook", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}"], Updates: {authorsByName_ADD: [{ name: "BUMP" }, { name: "ABORT" }]}){Books{title}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

test("UpdateSingle - Basic set mainAuthorByName abort hook", async () => {
  await runMutation({
    mutation: `updateBooks(_ids: ["${book1._id}"], Updates: {mainAuthor_SET: { name: "ABORT" }}){Books{title}}`,
    result: "updateBooks"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "Adam" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

//---------------------------Update Bulk-----------------------------------------------------------

test("UpdateMulti - Basic add single new author with hook", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}"] }, Updates: {authorsByName_ADD: { name: "BUMP" }}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });
});

test("UpdateMulti - Basic add single new author with abort hook", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}"] }, Updates: {authorsByName_ADD: [{ name: "BUMP" }, { name: "ABORT" }]}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "BUMPab" }] }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

test("UpdateSingle - Basic set mainAuthorByName abort hook", async () => {
  await runMutation({
    mutation: `updateBooksBulk(Match: { _id_in: ["${book1._id}"] }, Updates: {mainAuthor_SET: { name: "ABORT" }}){success}`,
    result: "updateBooksBulk"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, mainAuthorByName{name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", mainAuthorByName: { name: "Adam" } }]
  });

  await queryAndMatchArray({
    query: `{allAuthors(name_startsWith: "ABORT"){Authors{name}}}`,
    coll: "allAuthors",
    results: []
  });
});

//--------------------------------------------------------------------------------------

test("Basic add single new author in array", async () => {
  await runMutation({
    mutation: `updateBook(_id: "${book1._id}", Updates: {authorsByName_ADD: [{ name: "New Author" }]}){Book{title}}`,
    result: "updateBook"
  });

  await queryAndMatchArray({
    query: `{allBooks(title: "Book 1"){Books{title, authorsByName(SORT: { name: 1 }){name}}}}`,
    coll: "allBooks",
    results: [{ title: "Book 1", authorsByName: [{ name: "Adam" }, { name: "New Author" }] }]
  });
});
