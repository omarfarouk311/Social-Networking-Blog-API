const Post = require('../models/post');
const { ObjectId } = require('mongodb');

exports.getPosts = async (req, res, next) => {
    try {
        const { lastId } = req.query;
        let filter = {};
        if (lastId) {
            filter._id = { $gt: ObjectId.createFromHexString(lastId) };
        }

        const promises = [];
        promises.push(Post.countPosts());
        promises.push(Post.getPosts(filter)
            .limit(10)
            .project({ content: 0, imagesUrls: 0, commentsIds: 0 })
            .toArray());

        const [totalPosts, posts] = await Promise.all(promises);
        await Post.joinCreators(posts);
        const lastPostId = posts[posts.length - 1]._id.toString();

        return res.status(200).json({
            message: 'Posts fetched successfully',
            posts,
            totalPosts,
            lastPostId
        });
    }
    catch (err) {
        return next(err);
    }
};

exports.getPost = async (req, res, next) => {
    const { post } = req;

    //return early incase of no comments on the post
    if (!post.commentsIds.length) {
        post.comments = [];
        post.lastCommentId = null;
        delete post.commentsIds;
        return post;
    }

    await post.joinComments();
    await post.joinCommentsCreators();

    return res.status(200).json({
        message: 'Post fetched successfully',
        ...post
    });
};

exports.createPost = async (req, res, next) => {
    const { title, content, imagesUrls } = req.body;
    const { user } = req;
    const post = new Post({
        title,
        content,
        imagesUrls,
        creatorId: user._id,
        creationDate: new Date(Date.now()).toISOString(),
        tags: [],
        commentsIds: [],
        likes: 0,
        bookmarkingUsersIds: [],
        likingUsersIds: []
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
        await user.createPost(post);

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
    const { post, user } = req;
    try {
        await user.deletePost(post);
        return res.status(204).json({ message: 'Post deleted successfully' });
    }
    catch (err) {
        return next(err);
    }
}

exports.updatePost = async (req, res, next) => {
    try {
        const { user, post, body } = req;

        //request to updateLikes
        if (body.modifyLikes) {
            let updatedPost;
            if (body.value === 1) updatedPost = await user.likePost(post)[1];
            else updatedPost = await user.unlikePost(post)[1];

            return res.status(200).json({
                message: 'Likes updated successfully',
                ...updatedPost
            });
        }

        //otherwise, request to update post data
        if (req.invalidFileType) {
            const err = new Error('Invalid file type');
            err.statusCode = 422;
            throw err;
        }

        const update = {};
        if (body.title) update.title = body.title;
        if (body.content) update.content = body.content;
        if (body.tags) update.tags = body.tags;
        if (body.imagesUrls) update.imagesUrls = body.imagesUrls;

        const updatedPost = await post.updatePost({ _id: post._id }, update);
        return res.status(200).json({
            message: 'Post updated successfully',
            ...updatedPost
        });
    }
    catch (err) {
        return next(err);
    }
}