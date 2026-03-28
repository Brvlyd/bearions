'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { Product } from '@/lib/supabase'
import { productService } from '@/lib/products'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { getImageUrl } from '@/lib/image-utils'

interface Comment {
  id: string
  user_name: string
  text: string
  created_at: string
}

export default function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { language } = useLanguage()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [productId, setProductId] = useState<string>('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  useEffect(() => {
    if (productId) {
      loadPost()
      checkAuth()
    }
  }, [productId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadPost = async () => {
    try {
      setLoading(true)
      const data = await productService.getProductById(productId)
      setProduct(data)
      
      // Generate consistent likes based on product id
      const likes = parseInt(data.id.slice(-3), 16) % 500 + 50
      setLikeCount(likes)
      
      // Demo comments
      const demoComments: Comment[] = [
        { id: '1', user_name: 'john_doe', text: 'Love this! 😍', created_at: new Date().toISOString() },
        { id: '2', user_name: 'fashion_lover', text: 'Where can I get this?', created_at: new Date().toISOString() },
        { id: '3', user_name: 'style_icon', text: 'Amazing quality! 🔥', created_at: new Date().toISOString() },
      ]
      setComments(demoComments)
    } catch (error) {
      console.error('Error loading post:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = () => {
    if (liked) {
      setLikeCount(prev => prev - 1)
    } else {
      setLikeCount(prev => prev + 1)
    }
    setLiked(!liked)
  }

  const handleSave = () => {
    setSaved(!saved)
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !currentUser) return

    const comment: Comment = {
      id: Date.now().toString(),
      user_name: currentUser.email?.split('@')[0] || 'user',
      text: newComment,
      created_at: new Date().toISOString()
    }

    setComments([...comments, comment])
    setNewComment('')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/community" className="text-black underline">
            Back to Community
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="px-4 py-4 border-b bg-white">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-black hover:text-gray-600 font-semibold"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-base">Back</span>
          </button>
        </div>

        {/* Instagram-style Post Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 h-[calc(100vh-120px)]">
          {/* Left Side - Image */}
          <div className="bg-black flex items-center justify-center">
            <img
              src={getImageUrl(product.image_url)}
              alt={language === 'id' && product.name_id ? product.name_id : product.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Right Side - Details, Comments, Likes */}
          <div className="flex flex-col h-full border-l">
            {/* Post Header */}
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                    <span className="text-sm font-bold text-black">B</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-sm text-black">bearions</p>
                  <p className="text-xs text-gray-600">{product.category}</p>
                </div>
              </div>
              <button className="text-black hover:text-gray-600">
                <MoreHorizontal className="w-7 h-7" />
              </button>
            </div>

            {/* Comments Section - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Post Caption */}
              <div className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <span className="text-xs font-bold text-black">B</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-bold text-black">bearions</span>{' '}
                    <span className="text-black">
                      {product.description || (language === 'id' && product.name_id ? product.name_id : product.name)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">1d ago</p>
                  <div className="mt-2">
                    <p className="text-base font-bold text-black">{formatPrice(product.price)}</p>
                    <Link 
                      href={`/products/${product.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold inline-block mt-1"
                    >
                      View Product Details →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Comments */}
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {comment.user_name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-bold text-black">{comment.user_name}</span>{' '}
                      <span className="text-black">{comment.text}</span>
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-600">{timeAgo(comment.created_at)}</span>
                      <button className="text-xs text-gray-600 font-bold hover:text-black">
                        Reply
                      </button>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-red-500 transition">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions Section */}
            <div className="border-t bg-white">
              {/* Action Buttons */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-5">
                  <button 
                    onClick={handleLike}
                    className="text-black hover:text-gray-600 transition transform hover:scale-110"
                  >
                    <Heart className={`w-8 h-8 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <button className="text-black hover:text-gray-600 transition transform hover:scale-110">
                    <MessageCircle className="w-8 h-8" />
                  </button>
                  <button className="text-black hover:text-gray-600 transition transform hover:scale-110">
                    <Send className="w-8 h-8" />
                  </button>
                </div>
                <button 
                  onClick={handleSave}
                  className="text-black hover:text-gray-600 transition transform hover:scale-110"
                >
                  <Bookmark className={`w-8 h-8 ${saved ? 'fill-black' : ''}`} />
                </button>
              </div>

              {/* Like Count */}
              <div className="px-4 pb-2">
                <p className="font-bold text-base text-black">{likeCount.toLocaleString()} likes</p>
              </div>

              {/* Add Comment */}
              <div className="border-t p-4 bg-white">
                {currentUser ? (
                  <form onSubmit={handleAddComment} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 text-sm text-black placeholder-gray-500 bg-gray-100 border-2 border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-black focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className={`text-sm font-bold px-4 py-2 rounded-lg transition ${
                        newComment.trim() ? 'text-white bg-black hover:bg-gray-800' : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                      }`}
                    >
                      Post
                    </button>
                  </form>
                ) : (
                  <div className="text-center bg-gray-50 py-3 rounded-lg">
                    <Link href="/login" className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline">
                      Log in to like or comment
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
