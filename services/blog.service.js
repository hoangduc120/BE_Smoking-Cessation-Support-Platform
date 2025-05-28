const Blog = require("../models/blog.model");
const mongoose = require("mongoose");
const Comment = require("../models/comment.model");
const Tags = require("../models/tags.model");

class BlogService {
    async createBlog(blogData) {
        const slug = blogData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')

        // Xử lý tags nếu có
        if (blogData.tags && blogData.tags.length > 0) {
            const processedTags = [];

            for (let tag of blogData.tags) {
                // Xử lý tag có thể nhận vào cả dạng chuỗi (tagName) hoặc đối tượng {tagName}
                let tagName = typeof tag === 'string' ? tag : tag.tagName;

                // Loại bỏ dấu # nếu có
                if (tagName.startsWith('#')) {
                    tagName = tagName.substring(1);
                }

                // Kiểm tra xem tag đã tồn tại chưa
                let existingTag = await Tags.findOne({ tagName: { $regex: new RegExp(`^${tagName}$`, 'i') } });

                if (!existingTag) {
                    // Tạo mới tag nếu chưa tồn tại
                    existingTag = await Tags.create({
                        tagId: tagName.toLowerCase().replace(/\s+/g, '-'),
                        tagName: tagName,
                        blogCount: 1
                    });
                } else {
                    // Tăng số lượng blog cho tag
                    existingTag.blogCount += 1;
                    await existingTag.save();
                }

                processedTags.push(existingTag._id);
            }

            blogData.tags = processedTags;
        }

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
            .populate("tags", "tagId tagName")
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
                    path: "author",
                    select: "name email"
                }
            })
            .populate("tags", "tagId tagName")
    }

    async getAllTags() {
        return await Tags.find({}).sort({ tagName: 1 });
    }

    async getBlogsByTag(tagId, { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }) {
        // Tìm tag theo tagId
        const tag = await Tags.findOne({ tagId });

        if (!tag) {
            return null;
        }

        const query = {
            tags: tag._id,
            isDeleted: false,
            isHidden: false
        };

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const blogs = await Blog.find(query)
            .populate("user", "name email")
            .populate("comments")
            .populate("tags", "tagId tagName")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort(sortOptions);

        const total = await Blog.countDocuments(query);

        return {
            blogs,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            tag
        }
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

        // Xử lý tags nếu được cập nhật
        if (updateData.tags) {
            // Giảm số lượng blog cho các tag cũ
            if (blog.tags && blog.tags.length > 0) {
                for (let tagId of blog.tags) {
                    const tag = await Tags.findById(tagId);
                    if (tag) {
                        tag.blogCount = Math.max(0, tag.blogCount - 1);
                        await tag.save();
                    }
                }
            }

            // Xử lý tags mới
            if (updateData.tags.length > 0) {
                const processedTags = [];

                for (let tag of updateData.tags) {
                    // Xử lý tag có thể nhận vào cả dạng chuỗi (tagName) hoặc đối tượng {tagName}
                    let tagName = typeof tag === 'string' ? tag : tag.tagName;

                    // Loại bỏ dấu # nếu có
                    if (tagName.startsWith('#')) {
                        tagName = tagName.substring(1);
                    }

                    // Kiểm tra xem tag đã tồn tại chưa
                    let existingTag = await Tags.findOne({ tagName: { $regex: new RegExp(`^${tagName}$`, 'i') } });

                    if (!existingTag) {
                        // Tạo mới tag nếu chưa tồn tại
                        existingTag = await Tags.create({
                            tagId: tagName.toLowerCase().replace(/\s+/g, '-'),
                            tagName: tagName,
                            blogCount: 1
                        });
                    } else {
                        // Tăng số lượng blog cho tag
                        existingTag.blogCount += 1;
                        await existingTag.save();
                    }

                    processedTags.push(existingTag._id);
                }

                updateData.tags = processedTags;
            }
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

        // Giảm số lượng blog cho các tag
        if (blog.tags && blog.tags.length > 0) {
            for (let tagId of blog.tags) {
                const tag = await Tags.findById(tagId);
                if (tag) {
                    tag.blogCount = Math.max(0, tag.blogCount - 1);
                    await tag.save();
                }
            }
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