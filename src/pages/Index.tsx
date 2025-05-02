
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ChevronRight, Vote, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/context/Web3Context";

const Home = () => {
  const { isConnected } = useWeb3();

  useEffect(() => {
    document.title = "VoteChain - Blockchain Voting System";
  }, []);

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Secure Voting",
      description: "End-to-end encryption and blockchain technology ensure your vote is securely recorded and cannot be altered."
    },
    {
      icon: <Vote className="h-8 w-8 text-blue-600" />,
      title: "Transparent Process",
      description: "All votes are recorded on a public ledger, allowing for complete transparency while maintaining voter privacy."
    },
    {
      icon: <Check className="h-8 w-8 text-blue-600" />,
      title: "Verifiable Results",
      description: "Instantly verify that your vote was counted correctly without compromising the secrecy of your ballot."
    },
    {
      icon: <Lock className="h-8 w-8 text-blue-600" />,
      title: "Tamper-proof",
      description: "Blockchain immutability ensures that once cast, votes cannot be changed, deleted, or manipulated."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="py-20 md:py-28 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Democracy <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                  Reimagined
                </span>
              </motion.h1>
              <motion.p 
                className="text-xl mb-8 text-slate-700 dark:text-slate-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Secure, transparent, and tamper-proof voting powered by blockchain technology.
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                  <Link to={isConnected ? "/vote" : "/elections"}>
                    {isConnected ? "Cast Your Vote" : "View Elections"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#how-it-works">Learn More</a>
                </Button>
              </motion.div>
            </div>
            <div className="md:w-1/2">
              <motion.div 
                className="glass-panel p-6 rounded-2xl shadow-lg max-w-md mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/30 dark:to-teal-900/30 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
                    VoteChain
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Ongoing Election</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  2024 Presidential Election is now live. Connect your wallet to participate in the democratic process.
                </p>
                <div className="flex justify-between">
                  <div className="text-sm">
                    <p className="text-slate-500 dark:text-slate-400">End Date</p>
                    <p className="font-medium">Nov 5, 2024</p>
                  </div>
                  <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600">
                    <Link to="/elections">View Details</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How VoteChain Works</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Our blockchain-based voting system ensures security, transparency, and verification at every step of the election process.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="glass-panel p-6 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 w-16 h-16 flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-teal-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Democracy?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of voters who have already experienced the future of secure and transparent elections.
          </p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-slate-100">
            <Link to="/elections">Explore Active Elections</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
