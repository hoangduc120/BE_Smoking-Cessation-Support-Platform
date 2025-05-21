const Blog = require("../models/blog.model");
const mongoose = require("mongoose");
const Comment = require("../models/comment.model");


class BlogService {
    async createBlog(blogData) {
        const slug = blogData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        const blog = new Blog({
            ...blogData,
            slug: `${slug}-${Date.now()}`
        })
        await blog.save()
        return blog
    }
    async getAllBlogs({ page, limit, tag, slug, sortBy = 'createdAt', sortOrder = 'desc' }) {
        const query = { isDeleted: false, isHidden: false }
        if (tag) {
            query.tags = tag;
        }
        if (slug) {
            query.slug = { $regex: slug, $options: 'i' };
        }

        const sortOptions = {}
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const blogs = await Blog.find(query)
            .populate("user", "name email")
            .populate("comments")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort(sortOptions)

        const total = await Blog.countDocuments(query)

        return {
            blogs,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        }
    }
    async getBlogBySlug(slug) {
        return await Blog.findOne({
            slug,
            isDeleted: false,
            isHidden: false
        })
            .populate("user", "name email")
            .populate({
                path: "comments",
                populate: {
                    path: "user",
                    select: "name email"
                }
            })
    }
    async updateBlog(id, updateData, userId) {
        const blog = await Blog.findOne({
            _id: id,
            user: userId,
            isDeleted: false,
        })

        if (!blog) {
            throw new Error("Blog not found or you are not authorized to update it")
        }
        Object.assign(blog, updateData)
        await blog.save()
        return blog
    }
    async deleteBlog(id, userId) {
        const blog = await Blog.findOne({
            _id: id,
            user: userId,
            isDeleted: false,
        })

        if (!blog) {
            throw new Error("Blog not found or you are not authorized to delete it")
        }
        blog.isDeleted = true
        await blog.save()
        return blog
    }
    async likeBlog(id, userId) {
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
            return null;
        }

        const blog = await Blog.findOne({
            _id: id,
            isDeleted: false,
            isHidden: false
        });

        if (!blog) return null;

        // Chuyển đổi userId thành chuỗi để so sánh trực tiếp
        const userIdStr = userId.toString();

        // Kiểm tra xem user đã like hoặc dislike chưa
        const isLiked = blog.likes.some(like => like.toString() === userIdStr);
        const isDisliked = blog.dislikes.some(dislike => dislike.toString() === userIdStr);

        // Nếu đã dislike, xóa dislike trước
        if (isDisliked) {
            blog.dislikes = blog.dislikes.filter(dislike => dislike.toString() !== userIdStr);
        }

        // Toggle like
        if (isLiked) {
            blog.likes = blog.likes.filter(like => like.toString() !== userIdStr); // Bỏ like
        } else {
            blog.likes.push(userId); // Thêm like
        }

        return await blog.save();
    }
    async addComment(blogId, commentText, userId) {
        const blog = await Blog.findOne({
            _id: blogId,
            isDeleted: false
        });

        if (!blog) return null;

        const comment = new Comment({
            text: commentText,
            author: userId,
            blog: blogId
        });

        const savedComment = await comment.save();
        blog.comments.push(savedComment._id);
        await blog.save();

        return savedComment.populate('author', 'name email');
    }
}

module.exports = BlogService