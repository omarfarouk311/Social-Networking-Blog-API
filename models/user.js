const { getDb } = require('../util/database');

module.exports = class User {
    constructor({ _id, email, password, name, imageUrl, following, followers, bookmarks }) {
        this._id = _id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.imageUrl = imageUrl;
        this.following = following;
        this.followers = followers;
        this.bookmarks = bookmarks
    }

    async create() {
        const db = getDb();
        const { insertedId } = await db.collection('users').insertOne(this);
        this._id = insertedId;
    }


}