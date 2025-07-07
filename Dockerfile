FROM openjdk:17-jdk


RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs


ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

RUN mkdir -p $ANDROID_HOME && cd $ANDROID_HOME
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-8512546_latest.zip
RUN unzip commandlinetools-linux-8512546_latest.zip
RUN rm commandlinetools-linux-8512546_latest.zip


RUN yes | $ANDROID_HOME/cmdline-tools/bin/sdkmanager --licenses


RUN $ANDROID_HOME/cmdline-tools/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .


RUN npx expo prebuild --platform android


RUN cd android && ./gradlew assembleRelease

