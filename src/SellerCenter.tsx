import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Layout, BarChart, Package, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SellerCenter() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    info: '',
    tone: 'Sophisticated & Minimal'
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/brand-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.name,
          productInfo: formData.info,
          brandTone: formData.tone
        })
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F1E7]/50 pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl magazine-heading text-brand-green mb-2">Seller Center</h1>
            <p className="text-foreground/50 font-light">당신의 제품을 매력적인 로컬 브랜드로 성장시키세요.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-none border-brand-green text-brand-green uppercase tracking-widest text-[10px]">
              Preview Store
            </Button>
            <Button className="rounded-none bg-brand-green text-white uppercase tracking-widest text-[10px] hover:bg-brand-green/90">
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <Tabs defaultValue="ai-branding" className="w-full">
          <TabsList className="bg-transparent border-b border-black/5 w-full justify-start rounded-none h-auto p-0 mb-8 overflow-x-auto">
            <TabsTrigger value="dashboard" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Layout className="w-4 h-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ai-branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Sparkles className="w-4 h-4 mr-2" /> AI Branding
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <BarChart className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="pb-matching" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-green data-[state=active]:bg-transparent px-8 py-4 text-[10px] uppercase tracking-widest">
              <Package className="w-4 h-4 mr-2" /> PB Matching
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Sales', value: '₩12,450,000', trend: '+12.5%' },
                { label: 'Unique Visitors', value: '2,840', trend: '+5.2%' },
                { label: 'Conversion Rate', value: '3.8%', trend: '+0.4%' },
                { label: 'Active Popups', value: '2', trend: 'Live' },
              ].map((stat, i) => (
                <Card key={i} className="rounded-none border-black/5 bg-white">
                  <CardContent className="pt-6">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-2">{stat.label}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl magazine-heading text-brand-green">{stat.value}</p>
                      <Badge variant="secondary" className="bg-brand-green/5 text-brand-green text-[10px] mb-1">{stat.trend}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ai-branding">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Form Side */}
              <div className="space-y-8">
                <Card className="rounded-none border-black/5 bg-white">
                  <CardHeader>
                    <CardTitle className="magazine-heading text-2xl text-brand-green">Create Brand Identity</CardTitle>
                    <CardDescription className="text-xs">제품 정보만 입력하세요. 나머지는 AI가 생성합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest">Product Name</label>
                      <input 
                        className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green" 
                        placeholder="e.g. 제주 유채 꿀비누"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest">Product Info & Craftmanship</label>
                      <textarea 
                        className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-brand-green" 
                        placeholder="장인의 작업 방식이나 원재료의 특별함을 적어주세요."
                        value={formData.info}
                        onChange={e => setFormData({...formData, info: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest">Brand Tone</label>
                      <select 
                        className="w-full bg-[#FDFCF8] border border-black/5 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                        value={formData.tone}
                        onChange={e => setFormData({...formData, tone: e.target.value})}
                      >
                        <option>Sophisticated & Minimal</option>
                        <option>Traditional & Warm</option>
                        <option>Bold & Modern</option>
                        <option>Rustic & Artisan</option>
                      </select>
                    </div>
                    <Button 
                      className="w-full rounded-none bg-brand-green text-white h-14 uppercase tracking-widest text-xs disabled:opacity-50"
                      onClick={handleGenerate}
                      disabled={isGenerating || !formData.name}
                    >
                      {isGenerating ? 'Generating Identity...' : 'Generate Brand Package'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Result Side */}
              <div className="relative">
                {!aiResult && !isGenerating && (
                  <div className="h-full border-2 border-dashed border-black/5 flex flex-col items-center justify-center p-20 text-center grayscale opacity-50">
                    <Sparkles className="w-12 h-12 mb-6 text-brand-green" />
                    <p className="magazine-heading text-xl mb-2">Ready to Branding</p>
                    <p className="text-xs font-light">왼쪽 양식을 작성하여 AI 브랜드 패키징을 시작하세요.</p>
                  </div>
                )}

                {isGenerating && (
                  <div className="h-full bg-brand-green/[0.02] border border-black/5 flex flex-col items-center justify-center p-20 text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-12 h-12 mb-6 text-brand-green" />
                    </motion.div>
                    <p className="magazine-heading text-xl mb-4">Crafting Your Story</p>
                    <p className="text-xs font-light text-foreground/40 italic">장인의 철학과 제품의 가치를 분석하여 <br /> 최적의 브랜딩 키워드를 도출하고 있습니다...</p>
                  </div>
                )}

                {aiResult && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card className="rounded-none border-brand-green/20 bg-white overflow-hidden">
                      <div className="h-2 bg-brand-green"></div>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest rounded-none border-brand-green text-brand-green">AI Generated Assets</Badge>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Send className="w-3 h-3" /></Button>
                        </div>
                        <CardTitle className="magazine-heading text-3xl text-brand-green mt-4 tracking-tight italic">
                          "{aiResult.tagline}"
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Brand Story</label>
                          <p className="text-sm font-light leading-relaxed text-foreground/80 bg-brand-green/[0.03] p-4 italic">
                            {aiResult.story}
                          </p>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Signature Selling Points</label>
                          <ul className="space-y-3">
                            {aiResult.details.map((detail: string, i: number) => (
                              <li key={i} className="text-xs font-light flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-brand-green" /> {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-[#D66853] mb-3 block">Instagram Marketing Copy</label>
                          <p className="text-[11px] font-mono leading-relaxed bg-[#1B4332] text-white/90 p-6">
                            {aiResult.marketingCopy}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Button className="w-full rounded-none border-brand-green border-2 bg-transparent text-brand-green hover:bg-brand-green hover:text-white h-14 uppercase tracking-widest text-[10px]">
                      Apply This Branding to Product Page
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
