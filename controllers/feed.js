const Post = require('../models/post');
const User = require('../models/user');
const DatabaseFacade = require('../models/database facade');

exports.getPosts = async (req, res, next) => {
    const { lastId, tags, following } = req.query, { userId } = req;
    const filter = {};

    if (lastId) {
        filter._id = { $lt: lastId };
    }
    if (tags) {
        filter.tags = { $all: tags }
    }
    if (following) {
        const { followingIds } = await User.getUser({ _id: userId }, { _id: 0, followingIds: 1 });
        filter.creatorId = { $in: followingIds }
    }

    try {
        const result = await Post.getPostsInfo(filter, userId);
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
    const { postId } = req.params, { userId } = req;

    try {
        const post = await Post.getPostInfo({ _id: postId }, userId);
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

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        const imagesUrls = req.files ? req.files.map(file => file.path) : null;
        const post = new Post({
            ...body,
            creatorId: userId,
            creationDate: new Date(Date.now()),
            commentsIds: [],
            likes: 0,
            bookmarkingUsersIds: [],
            likingUsersIds: [],
            commentsCount: 0,
            bookmarksCount: 0,
            imagesUrls
        });

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
        await DatabaseFacade.deletePost(post);
        return res.status(204).json({ message: 'Post deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
};

exports.updatePost = async (req, res, next) => {
    const { post, body } = req;

    try {
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }
        if (req.files) {
            body.imagesUrls = req.files.map(file => file.path);
        }

        const projection = {};
        for (const key in body) {
            projection[key] = 1;
        }

        const updatedPost = await Post.findAndUpdatePost({ _id: post._id }, { $set: body }, projection);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getPostLikers = async (req, res, next) => {
    const { post } = req, { page = 0 } = req.query;

    try {
        const users = await Post.getPostLikers(page, post._id);
        return res.status(200).json({
            message: 'Post likers fetched successfully',
            users
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.updatePostLikes = async (req, res, next) => {
    const { userId, post } = req, { action } = req.body;
    let updatedPost;

    try {
        if (action === 1) {
            updatedPost = await User.likePost(userId, post._id);
            if (!updatedPost) {
                const err = new Error('Post already liked');
                err.statusCode = 409;
                throw err;
            }
        }
        else {
            updatedPost = await User.unlikePost(userId, post._id);
            if (!updatedPost) {
                const err = new Error("Post isn't liked");
                err.statusCode = 409;
                throw err;
            }
        }

        return res.status(200).json({
            message: 'Post Likes updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
};