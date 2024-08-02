const Post = require('../models/post');

exports.getPosts = async (req, res, next) => {
    const { lastId } = req.query;
    let filter = {};
    if (lastId) {
        filter._id = { $lt: lastId };
    }

    try {
        const result = await Post.getPosts(filter, true);
        return res.status(200).json({
            message: 'Posts fetched successfully',
            ...result
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const { postId } = req.params;
    try {
        const post = await Post.getPost({ _id: postId }, true);
        if (!post) {
            return res.status(404).json({
                message: 'Post not found'
            });
        }

        return res.status(200).json({
            message: 'Post fetched successfully',
            ...post
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const { body } = req.body, { userId } = req;
    const post = new Post({
        ...body,
        creatorId: userId,
        creationDate: new Date(Date.now()).toISOString(),
        tags: [],
        commentsIds: [],
        likes: 0,
        bookmarkingUsersIds: [],
        likingUsersIds: [],
        commentsCount: 0
    });

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        post.imagesUrls = [];
        if (req.files) {
            req.files.forEach(file => post.imagesUrls.push(file.path));
        }
        await post.createPost();

        return res.status(201).json({
            message: 'Post created successfully!',
            ...post
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.deletePost = async (req, res, next) => {
    const { post } = req;
    try {
        await post.deletePost({ _id: post._id });
        return res.status(204).json({ message: 'Post deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const { post, body } = req;
    if (!Object.keys(body).length) {
        return res.status(400).json({ message: 'Bad request' });
    }

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        body.imagesUrls = [];
        if (req.files) {
            req.files.forEach(file => body.imagesUrls.push(file.path));
        }

        const updatedPost = await post.updatePost({ _id: post._id }, body);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
};