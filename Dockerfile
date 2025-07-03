FROM openjdk:17-jdk

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Install Android SDK
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

RUN mkdir -p $ANDROID_HOME && cd $ANDROID_HOME
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip
RUN unzip commandlinetools-linux-8512546_latest.zip
RUN rm commandlinetools-linux-8512546_latest.zip

# Accept licenses
RUN yes | $ANDROID_HOME/cmdline-tools/bin/sdkmanager --licenses

# Install Android SDK components
RUN $ANDROID_HOME/cmdline-tools/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Android project
RUN npx expo prebuild --platform android

# Build APK
RUN cd android && ./gradlew assembleRelease

# The APK will be in android/app/build/outputs/apk/release/ 