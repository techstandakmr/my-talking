class PeerService {
  constructor() {
    // Initialize peer connection when instance is created
    this.createPeer();
  }

  createPeer() {
    // Close existing peer connection if any before creating new one
    if (this.peer) {
      this.peer.close();
    }
    // Create new RTCPeerConnection with ICE servers for NAT traversal
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302", // Google public STUN server
            "stun:global.stun.twilio.com:3478", // Twilio public STUN server
          ],
        },
      ],
    });
  }

  // Handle incoming offer and create an answer
  async getAnswer(offer) {
    if (this.peer) {
      // Set remote description with received offer
      await this.peer.setRemoteDescription(offer);
      // Create answer to the offer
      const ans = await this.peer.createAnswer();
      // Set local description with the created answer
      await this.peer.setLocalDescription(new RTCSessionDescription(ans));
      // Return the answer to be sent back to offerer
      return ans;
    }
  }

  // Set local description from the answer received from remote peer
  async setRemoteAnswer(ans) {
    if (this.peer) {
      // Set remote description with received answer
      await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
    }
  }

  // Create an offer to initiate connection
  async getOffer() {
    if (this.peer) {
      // Create an offer SDP
      const offer = await this.peer.createOffer();
      // Set local description with the created offer
      await this.peer.setLocalDescription(new RTCSessionDescription(offer));
      // Return the offer to be sent to remote peer
      return offer;
    }
  }
}

// Export a singleton instance of PeerService
export default new PeerService();
