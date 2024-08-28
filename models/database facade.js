const Post = require('./post.js');
const Comment = require('./comment.js');
const User = require('./user.js');
const { deleteImages } = require('../util/images.js');
const { getDb } = require('../util/database.js');

module.exports = class DatabaseFacade {

    static async deleteUser(filters) {
        const promises = [
            User.deleteUser({ _id: filters._id })
            ,
            DatabaseFacade.deletePosts({ creatorId: filters._id })
            ,
            DatabaseFacade.deleteComments({ creatorId: filters._id })
            ,
            Post.updatePosts({ _id: { $in: filters.likedPostsIds } }, {
                $inc: { likes: -1 },
                $pull: { likingUsersIds: filters._id }
            })
            ,
            Post.updatePosts({ _id: { $in: filters.bookmarksIds } }, { $pull: { bookmarkingUsersIds: filters._id } })
            ,
            Comment.updateComments({ _id: { $in: filters.likedCommentsIds } }, {
                $inc: { likes: -1 },
                $pull: { likingUsersIds: filters._id }
            })
            ,
            User.updateUsers({ _id: { $in: filters.followersIds } }, {
                $pull: { followingIds: filters._id },
                $inc: { followingIds: -1 }
            })
            ,
            User.updateUsers({ _id: { $in: filters.followingIds } }, {
                $pull: { followersIds: filters._id },
                $inc: { followersIds: -1 }
            })
        ];

        await Promise.all(promises);
        const { imageUrl } = filters;
        deleteImages([imageUrl]);
    }

    static async deletePost(filters) {
        const promises = [
            Post.deletePost({ _id: filters._id })
            ,
            DatabaseFacade.deleteComments({ postId: filters._id })
            ,
            User.removePostFromBookmarks(filters.bookmarkingUsersIds, filters._id)
            ,
            User.removePostFromLikedPosts(filters.likingUsersIds, filters._id)
        ];

        await Promise.all(promises);
        const { imagesUrls } = filters
        deleteImages(imagesUrls);
    }

    static deleteComment(filters) {
        const promises = [
            Comment.deleteComment({ _id: filters._id })
            ,
            DatabaseFacade.deleteComments({ parentsIds: filters._id })
            ,
            User.removeCommentFromLikedComments(filters.likingUsersIds, filters.commentId)
            ,
            Post.updatePost({ _id: filters.postId }, { $inc: { commentsCount: -1 } })
        ];

        if (filters.parentsIds.length) {
            promises.push(Comment.updateComments({ _id: { $in: filters.parentsIds } }, { $inc: { repliesCount: -1 } }));
        }

        return Promise.all(promises);
    }

    static async deleteComments(filter) {
        const comments = await Comment.getComments(filter, { likingUsersIds: 1, postId: 1, parentsIds: 1 });
        const likingUsersIds = [], commentsIds = [], parentsIds = [];
        const commentsOnPost = new Map();

        comments.forEach(comment => {
            likingUsersIds.push(...comment.likingUsersIds);
            commentsIds.push(comment._id);
            const cnt = commentsOnPost.get(comment.postId);
            commentsOnPost.set(comment.postId, cnt ? cnt + 1 : 1);
            if (comment.parentsIds.length) parentsIds.push(...comment.parentsIds);
        });

        const operations = [];
        commentsOnPost.forEach(([key, value]) => {
            operations.push({ updateOne: { filter: { _id: key }, update: { $inc: { commentsCount: value } } } });
        });

        const db = getDb();
        const promises = [
            Comment.deleteComments(filter)
            ,
            User.removeCommentsFromLikedComments(likingUsersIds, commentsIds)
            ,
            db.collection('posts').bulkWrite(operations)
            ,
            Comment.updateComments({ _id: { $in: parentsIds } }, { $inc: { repliesCount: -1 } })
        ];

        return Promise.all(promises);
    }

    static async deletePosts(filter) {
        const posts = await Post.getPosts(filter, { imagesUrls: 1, likingUsersIds: 1, bookmarkingUsersIds: 1 });
        const likingUsersIds = [], bookmarkingUsersIds = [], imagesUrls = [], postsIds = [];

        posts.forEach(post => {
            likingUsersIds.push(...post.likingUsersIds);
            bookmarkingUsersIds.push(...post.bookmarkingUsersIds);
            imagesUrls.push(...post.imagesUrls);
            postsIds.push(post._id);
        });

        const promises = [
            Post.deletePosts(filter)
            ,
            DatabaseFacade.deleteComments({ postId: { $in: postsIds } })
            ,
            User.removePostsFromBookmarks(bookmarkingUsersIds, postsIds)
            ,
            User.removePostsFromLikedPosts(likingUsersIds, postsIds)
        ];

        await Promise.all(promises);
        deleteImages(imagesUrls);
    }

}