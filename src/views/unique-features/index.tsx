import React, { FC } from "react";
import { 
  MdRocketLaunch, 
  MdAutoAwesome, 
  MdTrendingUp, 
  MdSecurity, 
  MdAnalytics,
  MdGroups,
  MdSpeed,
  MdCheckCircle
} from "react-icons/md";
import { 
  LuZap, 
  LuShield, 
  LuBarChart3, 
  LuUsers,
  LuSparkles,
  LuTarget
} from "react-icons/lu";

interface UniqueFeaturesProps {
  setOpenCreateModal: (value: boolean) => void;
}

export const UniqueFeatures: FC<UniqueFeaturesProps> = ({ setOpenCreateModal }) => {
  const mainFeatures = [
    {
      icon: <MdRocketLaunch className="w-8 h-8" />,
      title: "Token Launch",
      description: "Create Solana tokens in minutes with our guided flow, it's simple",
      highlight: "Core Feature",
      color: "from-blue-500 to-purple-600",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500"
    },
    {
      icon: <MdAutoAwesome className="w-8 h-8" />,
      title: "AI Meme Kit",
      description: "AI-generated marketing content, logos, and social media assets",
      highlight: "AI-Powered",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500"
    },
    {
      icon: <MdTrendingUp className="w-8 h-8" />,
      title: "Multi-DEX Liquidity",
      description: "One-click liquidity on Orca & Raydium with automatic pool discovery",
      highlight: "Unique",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500"
    }
  ];

  const additionalFeatures = [
    {
      icon: <LuShield className="w-6 h-6" />,
      title: "Honest Launch",
      description: "Automatic mint & freeze authority revocation",
      benefit: "Prevents rug pulls"
    },
    {
      icon: <LuBarChart3 className="w-6 h-6" />,
      title: "Live Analytics",
      description: "Real-time price, liquidity & holder tracking",
      benefit: "Stay informed"
    },
    {
      icon: <LuUsers className="w-6 h-6" />,
      title: "Community Tools",
      description: "Airdrop tokens to multiple wallets instantly",
      benefit: "Build community"
    },
    {
      icon: <LuSparkles className="w-6 h-6" />,
      title: "Pro Features",
      description: "Enhanced AI, premium assets & priority support",
      benefit: "Professional results"
    },
    {
      icon: <LuZap className="w-6 h-6" />,
      title: "Guided Flow",
      description: "Step-by-step process from idea to launched token",
      benefit: "No experience needed"
    },
    {
      icon: <LuTarget className="w-6 h-6" />,
      title: "Marketing Ready",
      description: "Twitter threads, hashtags & posting schedules",
      benefit: "Launch with buzz"
    }
  ];

  return (
    <section className="section py-20">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="h2 mb-4 text-fg">
            Why Choose Our Platform?
          </h2>
          <p className="text-muted text-lg max-w-3xl mx-auto">
            We're not just another token creator. We provide everything you need to launch, 
            market, and grow your Solana token with AI-powered tools and multi-DEX liquidity.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {mainFeatures.map((feature, index) => (
            <div 
              key={index}
              className="relative group"
            >
              <div className={`${feature.bgColor} rounded-2xl p-8 border border-muted/10 backdrop-blur-3xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl`}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 rounded-2xl`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`${feature.iconColor} mb-4`}>
                    {feature.icon}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold text-fg">{feature.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${feature.color} text-white`}>
                      {feature.highlight}
                    </span>
                  </div>
                  
                  <p className="text-muted mb-6">{feature.description}</p>
                  
                  <div className="flex items-center text-sm text-muted">
                    <MdCheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    <span>Included in all plans</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-bg/40 rounded-3xl p-8 border border-muted/10 backdrop-blur-3xl">
          <h3 className="text-2xl font-bold text-center text-fg mb-8">
            Complete Launch Ecosystem
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div 
                key={index}
                className="flex items-start space-x-4 p-4 rounded-xl hover:bg-muted/10 transition-all duration-300"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold text-fg mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted mb-2">{feature.description}</p>
                  <span className="text-xs text-primary font-medium">{feature.benefit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-fg mb-4">
              How We Compare
            </h3>
            <p className="text-muted">
              See what makes us different from other token launch platforms
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Other Platforms */}
            <div className="bg-muted/20 rounded-xl p-6 border border-muted/20">
              <h4 className="font-bold text-fg mb-4 text-center">Other Platforms</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center text-muted">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  Basic token creation
                </li>
                <li className="flex items-center text-muted">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  Single DEX integration
                </li>
                <li className="flex items-center text-muted">
                  <span className="w-4 h-4 mr-3 text-muted">✗</span>
                  No marketing tools
                </li>
                <li className="flex items-center text-muted">
                  <span className="w-4 h-4 mr-3 text-muted">✗</span>
                  No AI assistance
                </li>
                <li className="flex items-center text-muted">
                  <span className="w-4 h-4 mr-3 text-muted">✗</span>
                  Limited analytics
                </li>
              </ul>
            </div>

            {/* Our Platform */}
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-6 border-2 border-primary/20 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-black px-4 py-1 rounded-full text-sm font-bold">
                  Our Platform
                </span>
              </div>
              
              <h4 className="font-bold text-fg mb-4 text-center mt-2">Our Platform</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center text-fg">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  Advanced token creation
                </li>
                <li className="flex items-center text-fg">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  Multi-DEX (Orca + Raydium)
                </li>
                <li className="flex items-center text-fg">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  AI marketing kit
                </li>
                <li className="flex items-center text-fg">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  AI-powered content
                </li>
                <li className="flex items-center text-fg">
                  <MdCheckCircle className="w-4 h-4 mr-3 text-green-500" />
                  Complete analytics
                </li>
              </ul>
            </div>

            {/* Benefits */}
            <div className="bg-success/10 rounded-xl p-6 border border-success/20">
              <h4 className="font-bold text-fg mb-4 text-center">Key Benefits</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start text-fg">
                  <LuSparkles className="w-4 h-4 mr-3 text-success mt-0.5" />
                  <span>Launch with professional marketing</span>
                </li>
                <li className="flex items-start text-fg">
                  <LuShield className="w-4 h-4 mr-3 text-success mt-0.5" />
                  <span>Built-in trust mechanisms</span>
                </li>
                <li className="flex items-start text-fg">
                  <LuTarget className="w-4 h-4 mr-3 text-success mt-0.5" />
                  <span>Higher success rate</span>
                </li>
                <li className="flex items-start text-fg">
                  <LuZap className="w-4 h-4 mr-3 text-success mt-0.5" />
                  <span>Faster time to market</span>
                </li>
                <li className="flex items-start text-fg">
                  <LuBarChart3 className="w-4 h-4 mr-3 text-success mt-0.5" />
                  <span>Better liquidity options</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-8 border border-primary/20">
            <h3 className="text-2xl font-bold text-fg mb-4">
              Ready to Launch Your Token?
            </h3>
            <p className="text-muted mb-6 max-w-2xl mx-auto">
              Get started with our guided flow 
              and launch your token with professional marketing in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setOpenCreateModal(true)}
                className="btn btn-primary px-8 py-4 text-lg font-bold group"
              >
                <MdRocketLaunch className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Start Creating Token
              </button>
              
              <a 
                href="/meme-kit" 
                className="btn btn-ghost px-8 py-4 text-lg font-bold group"
              >
                <MdAutoAwesome className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Try AI Meme Kit
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
